-- ============================================================
-- Riff Clubes (C2): comunidades fechadas e entrada por convite
-- ============================================================
-- * Atividade de condomínio/clube (product <> 'pro') só aparece para membros
--   ativos daquela comunidade. As do Riff Pro continuam públicas como antes.
-- * Atividade ligada a uma comunidade vira product = 'clubes' sozinha; só gestor
--   ou instrutor da comunidade cria atividade nela.
-- * Convites: o gestor gera um código (com validade, limite de usos e papel);
--   quem tem o código entra pela função join_organization. Removido não volta.
-- * Criar comunidade é tarefa da equipe Riff (venda B2B): admin_create_community
--   só roda pelo terminal (sem EXECUTE para anon/authenticated).
-- * Só membro ativo reserva atividade de comunidade (create_booking).
-- * Local criado para comunidade nasce com visibility = 'members'.
-- ============================================================

BEGIN;

-- 1. Atividades de comunidade só para membros ----------------------------
DROP POLICY IF EXISTS "public_sessions_read" ON public.sessions;
CREATE POLICY "public_sessions_read" ON public.sessions FOR SELECT
  USING (
    (product = 'pro' AND (
      status IN ('active', 'full')
      OR id IN (SELECT session_id FROM public.bookings WHERE student_id = (SELECT public._profile_id()))
    ))
    OR (product <> 'pro' AND public.is_org_member(organization_id))
  );

-- 2. Regras de produto da atividade ----------------------------------------
-- Roda depois de session_link_org_venue (ordem alfabética dos triggers BEFORE).
CREATE OR REPLACE FUNCTION public.session_product_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_kind text;
BEGIN
  SELECT kind INTO v_kind FROM public.organizations WHERE id = NEW.organization_id;

  IF v_kind IN ('condo', 'club') THEN
    NEW.product := 'clubes';
    -- auth.uid() nulo = operação do servidor (seeds, scripts da equipe)
    IF auth.uid() IS NOT NULL
       AND NOT public.is_org_member(NEW.organization_id, ARRAY['owner', 'admin', 'instructor']) THEN
      RAISE EXCEPTION 'forbidden_community' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.product <> 'pro' THEN
    RAISE EXCEPTION 'community_required' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.session_product_rules() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER session_product_rules
  BEFORE INSERT OR UPDATE OF organization_id, product ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.session_product_rules();

-- 3. Convites --------------------------------------------------------------
CREATE TABLE public.organization_invites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code            text NOT NULL UNIQUE,
  role            text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'instructor')),
  max_uses        integer CHECK (max_uses IS NULL OR max_uses >= 1),
  uses            integer NOT NULL DEFAULT 0,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_by      uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_organization_invites_org ON public.organization_invites (organization_id);
CREATE INDEX idx_organization_invites_created_by ON public.organization_invites (created_by);

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
-- Só gestores veem os convites da própria comunidade; criar e revogar é por função.
CREATE POLICY "organization_invites_admin_read" ON public.organization_invites FOR SELECT
  USING (public.is_org_member(organization_id, ARRAY['owner', 'admin']));

-- Código legível: 8 caracteres sem 0/O/1/I, exibido como XXXX-XXXX
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text LANGUAGE plpgsql VOLATILE SET search_path = ''
AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
BEGIN
  LOOP
    v_code := '';
    FOR i IN 1..8 LOOP
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.organization_invites WHERE code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$;
REVOKE ALL ON FUNCTION public.generate_invite_code() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_invite(
  p_org      uuid,
  p_role     text    DEFAULT 'member',
  p_max_uses integer DEFAULT NULL,
  p_days     integer DEFAULT 30
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_code text;
BEGIN
  IF NOT public.is_org_member(p_org, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF (SELECT kind FROM public.organizations WHERE id = p_org) NOT IN ('condo', 'club') THEN
    RAISE EXCEPTION 'not_a_community' USING ERRCODE = 'P0001';
  END IF;
  IF p_role NOT IN ('member', 'instructor') THEN
    RAISE EXCEPTION 'invalid_role' USING ERRCODE = 'P0001';
  END IF;

  v_code := public.generate_invite_code();
  INSERT INTO public.organization_invites (organization_id, code, role, max_uses, expires_at, created_by)
  VALUES (p_org, v_code, p_role, p_max_uses,
          CASE WHEN p_days IS NULL THEN NULL ELSE now() + make_interval(days => p_days) END,
          public._profile_id());
  RETURN jsonb_build_object('code', substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4));
END;
$$;
REVOKE ALL ON FUNCTION public.create_invite(uuid, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invite(uuid, text, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_invite(p_invite uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.organization_invites SET revoked_at = now()
  WHERE id = p_invite AND revoked_at IS NULL
    AND public.is_org_member(organization_id, ARRAY['owner', 'admin']);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'forbidden_or_not_found' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_invite(uuid) TO authenticated;

-- Entrar numa comunidade com o código (aceita "k7q2-m9px", "K7Q2 M9PX"...)
CREATE OR REPLACE FUNCTION public.join_organization(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_profile uuid := public._profile_id();
  v_invite  record;
  v_member  record;
  v_name    text;
BEGIN
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_invite FROM public.organization_invites
  WHERE code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
  FOR UPDATE;

  IF v_invite.id IS NULL OR v_invite.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'invalid_code');
  END IF;
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'code', 'expired');
  END IF;

  SELECT name INTO v_name FROM public.organizations WHERE id = v_invite.organization_id;
  SELECT * INTO v_member FROM public.organization_members
  WHERE organization_id = v_invite.organization_id AND profile_id = v_profile;

  IF v_member.organization_id IS NOT NULL THEN
    IF v_member.status = 'removed' THEN
      RETURN jsonb_build_object('success', false, 'code', 'removed');
    END IF;
    RETURN jsonb_build_object('success', true, 'code', 'already_member',
                              'organization_id', v_invite.organization_id, 'name', v_name);
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.uses >= v_invite.max_uses THEN
    RETURN jsonb_build_object('success', false, 'code', 'exhausted');
  END IF;

  INSERT INTO public.organization_members (organization_id, profile_id, role, status)
  VALUES (v_invite.organization_id, v_profile, v_invite.role, 'active');
  UPDATE public.organization_invites SET uses = uses + 1 WHERE id = v_invite.id;

  RETURN jsonb_build_object('success', true, 'code', 'joined',
                            'organization_id', v_invite.organization_id, 'name', v_name, 'role', v_invite.role);
END;
$$;
REVOKE ALL ON FUNCTION public.join_organization(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_organization(text) TO authenticated;

-- 4. Criar comunidade: só a equipe Riff, pelo terminal ---------------------
--   npx supabase db query --linked "SELECT public.admin_create_community('Residencial Jardins', 'condo', 'sindico@exemplo.com')"
CREATE OR REPLACE FUNCTION public.admin_create_community(p_name text, p_kind text, p_owner_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_owner uuid;
  v_org   uuid;
BEGIN
  IF p_kind NOT IN ('condo', 'club') THEN
    RAISE EXCEPTION 'kind deve ser condo ou club';
  END IF;
  IF coalesce(btrim(p_name), '') = '' THEN
    RAISE EXCEPTION 'nome obrigatório';
  END IF;

  SELECT p.id INTO v_owner
  FROM public.profiles p JOIN auth.users u ON u.id = p.user_id
  WHERE lower(u.email) = lower(btrim(p_owner_email));
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'nenhuma conta com o e-mail %; a pessoa precisa se cadastrar antes', p_owner_email;
  END IF;

  INSERT INTO public.organizations (kind, name, created_by) VALUES (p_kind, btrim(p_name), v_owner)
  RETURNING id INTO v_org;
  INSERT INTO public.organization_members (organization_id, profile_id, role) VALUES (v_org, v_owner, 'owner');
  RETURN v_org;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_create_community(text, text, text) FROM PUBLIC, anon, authenticated;

-- 5. Reserva: só membro reserva atividade de comunidade (corpo igual ao de 20261027000008 + checagem)
CREATE OR REPLACE FUNCTION public.create_booking(
  p_session_id  uuid,
  p_source      text  DEFAULT NULL,
  p_attribution jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id  uuid;
  v_student  uuid;
  v_session  record;
  v_booking  uuid;
  v_existing record;
  v_source   text := CASE
    WHEN p_source IN ('organizer_link', 'activity_link', 'feed', 'explore', 'direct', 'other') THEN p_source
    WHEN p_source IS NULL THEN NULL
    ELSE 'other'
  END;
  v_attribution jsonb := public.sanitize_attribution(p_attribution);
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'unauthenticated');
  END IF;

  SELECT id INTO v_student FROM public.profiles WHERE user_id = v_user_id;
  IF v_student IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'profile_not_found');
  END IF;

  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'session_not_found');
  END IF;

  IF v_session.status NOT IN ('active', 'full') THEN
    RETURN jsonb_build_object('success', false, 'code', 'session_unavailable');
  END IF;

  -- Check if session already started
  IF (v_session.date + v_session.start_time) < now() THEN
    RETURN jsonb_build_object('success', false, 'code', 'session_started');
  END IF;

  IF v_session.current_participants >= v_session.max_participants THEN
    RETURN jsonb_build_object('success', false, 'code', 'session_full');
  END IF;

  IF v_session.professional_id = v_student THEN
    RETURN jsonb_build_object('success', false, 'code', 'self_booking');
  END IF;

  -- Riff Clubes: só membro ativo da comunidade reserva
  IF v_session.product <> 'pro' AND NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_session.organization_id AND m.profile_id = v_student AND m.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'code', 'not_member');
  END IF;

  -- Check for existing booking (handle re-booking after cancellation)
  SELECT * INTO v_existing
  FROM public.bookings
  WHERE session_id = p_session_id AND student_id = v_student;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.status IN ('pending', 'confirmed', 'completed') THEN
      RETURN jsonb_build_object('success', false, 'code', 'already_booked');
    END IF;

    -- Re-activate a cancelled booking (a origem passa a ser a desta nova reserva)
    UPDATE public.bookings
    SET status = 'pending',
        cancelled_at = NULL,
        cancellation_reason = NULL,
        payment_status = CASE WHEN v_session.price_per_slot = 0 THEN 'free' ELSE 'pending' END,
        amount_total = v_session.price_per_slot,
        professional_payout = v_session.price_per_slot,
        source = v_source,
        attribution = v_attribution,
        updated_at = now()
    WHERE id = v_existing.id
    RETURNING id INTO v_booking;
  ELSE
    INSERT INTO public.bookings (
      session_id, student_id, professional_id,
      amount_total, professional_payout,
      payment_status, status,
      product, source, attribution
    ) VALUES (
      p_session_id, v_student, v_session.professional_id,
      v_session.price_per_slot, v_session.price_per_slot,
      CASE WHEN v_session.price_per_slot = 0 THEN 'free' ELSE 'pending' END,
      'pending',
      v_session.product, v_source, v_attribution
    ) RETURNING id INTO v_booking;
  END IF;

  -- Increment participants
  UPDATE public.sessions
  SET current_participants = current_participants + 1,
      status = CASE WHEN current_participants + 1 >= max_participants THEN 'full' ELSE status END
  WHERE id = p_session_id;

  RETURN jsonb_build_object('success', true, 'code', 'booked', 'booking_id', v_booking);
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, text, jsonb) TO authenticated;

-- 6. Local criado para comunidade nasce visível só para membros (corpo igual ao de 20261027000004 + visibility)
CREATE OR REPLACE FUNCTION public.resolve_venue(
  p_org uuid, p_name text, p_address text, p_lat numeric, p_lng numeric,
  p_location_type text, p_city text, p_created_by uuid
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_venue uuid;
  v_kind  text := CASE p_location_type
    WHEN 'park' THEN 'park'
    WHEN 'beach' THEN 'beach'
    WHEN 'studio' THEN 'studio'
    WHEN 'gym' THEN 'gym'
    WHEN 'condominium' THEN 'condo'
    WHEN 'online' THEN 'online'
    WHEN 'outdoor' THEN 'public_space'
    ELSE 'other'
  END;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_venue FROM public.venues
  WHERE organization_id IS NOT DISTINCT FROM p_org
    AND lower(btrim(name)) = lower(btrim(p_name))
    AND lower(btrim(coalesce(address, ''))) = lower(btrim(coalesce(p_address, '')));

  IF v_venue IS NULL THEN
    INSERT INTO public.venues (organization_id, name, kind, address, city, latitude, longitude, created_by, visibility)
    VALUES (p_org, btrim(p_name), v_kind, nullif(btrim(coalesce(p_address, '')), ''), p_city, p_lat, p_lng, p_created_by,
            -- local de condomínio ou clube só aparece para membros
            CASE WHEN (SELECT kind FROM public.organizations WHERE id = p_org) IN ('condo', 'club')
                 THEN 'members' ELSE 'public' END)
    RETURNING id INTO v_venue;
  END IF;
  RETURN v_venue;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_venue(uuid, text, text, numeric, numeric, text, text, uuid) FROM PUBLIC, anon, authenticated;

COMMIT;
