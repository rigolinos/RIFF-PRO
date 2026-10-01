-- ============================================================
-- Lote 3: organizações, locais, presença e resultados
-- ============================================================
-- Prepara a porta do Riff Clubes sem construí-lo:
--   * organizations / organization_members: todo organizador do Pro ganha uma
--     organização "solo"; condomínios e clubes serão outros kinds no futuro.
--   * venues: o local de cada atividade, com dono opcional e visibilidade.
--   * sessions.organization_id / venue_id: preenchidos por trigger a partir dos
--     campos location_* que o app já envia (o app não muda neste lote).
--   * bookings.attendance_*: presença registrada (presente, ausente, atrasado,
--     justificado), sincronizada com o check-in que o close_session já faz.
--   * activity_results: placar, posição e detalhes por atividade.
-- Regra "registrar tudo, expor pouco": presença e resultados só são lidos
-- pelo organizador da atividade e pelo próprio participante.
-- ============================================================

BEGIN;

-- 1. ORGANIZAÇÕES --------------------------------------------------------
CREATE TABLE public.organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       text NOT NULL CHECK (kind IN ('solo', 'company', 'condo', 'club')),
  -- Organização solo não guarda nome: a vitrine é o perfil do organizador
  -- (evita duplicar dado pessoal).
  name       text CHECK (kind = 'solo' OR name IS NOT NULL),
  slug       text UNIQUE,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX organizations_one_solo_per_profile ON public.organizations (created_by) WHERE kind = 'solo';
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE public.organization_members (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES public.profiles(id),
  role            text NOT NULL CHECK (role IN ('owner', 'admin', 'instructor', 'member')),
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'removed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, profile_id)
);
CREATE INDEX organization_members_profile ON public.organization_members (profile_id);

CREATE OR REPLACE FUNCTION public.is_org_member(p_org uuid, p_roles text[] DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = p_org
      AND m.profile_id = public._profile_id()
      AND m.status = 'active'
      AND (p_roles IS NULL OR m.role = ANY (p_roles))
  )
$$;
REVOKE ALL ON FUNCTION public.is_org_member(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, text[]) TO anon, authenticated;

-- Cria (se faltar) a organização solo do organizador e o vínculo de dono.
CREATE OR REPLACE FUNCTION public.ensure_solo_organization(p_profile uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT id INTO v_org FROM public.organizations WHERE kind = 'solo' AND created_by = p_profile;
  IF v_org IS NULL THEN
    INSERT INTO public.organizations (kind, created_by) VALUES ('solo', p_profile)
    RETURNING id INTO v_org;
  END IF;
  INSERT INTO public.organization_members (organization_id, profile_id, role)
  VALUES (v_org, p_profile, 'owner')
  ON CONFLICT (organization_id, profile_id) DO NOTHING;
  RETURN v_org;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_solo_organization(uuid) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organizations_read" ON public.organizations FOR SELECT
  USING (kind IN ('solo', 'company') OR public.is_org_member(id));
CREATE POLICY "organizations_admin_update" ON public.organizations FOR UPDATE
  USING (public.is_org_member(id, ARRAY['owner', 'admin']))
  WITH CHECK (public.is_org_member(id, ARRAY['owner', 'admin']));

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organization_members_read" ON public.organization_members FOR SELECT
  USING (profile_id = public._profile_id() OR public.is_org_member(organization_id, ARRAY['owner', 'admin']));

-- 2. LOCAIS ---------------------------------------------------------------
CREATE TABLE public.venues (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  name            text NOT NULL,
  kind            text NOT NULL DEFAULT 'other'
    CHECK (kind IN ('park', 'beach', 'public_space', 'studio', 'gym', 'condo', 'club', 'arena', 'online', 'other')),
  address         text,
  city            text,
  state           text,
  latitude        numeric(10,7),
  longitude       numeric(10,7),
  visibility      text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'members')),
  created_by      uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
-- Um local por (organização, nome, endereço): atividades no mesmo lugar reaproveitam o venue.
CREATE UNIQUE INDEX venues_org_name_address
  ON public.venues (organization_id, lower(btrim(name)), lower(btrim(coalesce(address, ''))));
CREATE TRIGGER venues_updated_at BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venues_read" ON public.venues FOR SELECT
  USING (visibility = 'public' OR (organization_id IS NOT NULL AND public.is_org_member(organization_id)));
CREATE POLICY "venues_insert" ON public.venues FOR INSERT
  WITH CHECK (
    created_by = public._profile_id()
    AND (organization_id IS NULL OR public.is_org_member(organization_id, ARRAY['owner', 'admin', 'instructor']))
  );
CREATE POLICY "venues_update" ON public.venues FOR UPDATE
  USING (created_by = public._profile_id() OR public.is_org_member(organization_id, ARRAY['owner', 'admin']));

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
    INSERT INTO public.venues (organization_id, name, kind, address, city, latitude, longitude, created_by)
    VALUES (p_org, btrim(p_name), v_kind, nullif(btrim(coalesce(p_address, '')), ''), p_city, p_lat, p_lng, p_created_by)
    RETURNING id INTO v_venue;
  END IF;
  RETURN v_venue;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_venue(uuid, text, text, numeric, numeric, text, text, uuid) FROM PUBLIC, anon, authenticated;

-- 3. ATIVIDADES: organização e local -----------------------------------
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id);
CREATE INDEX IF NOT EXISTS idx_sessions_organization ON public.sessions (organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_venue ON public.sessions (venue_id);

-- 4. PRESENÇA -------------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS attendance_status text
    CHECK (attendance_status IN ('present', 'absent', 'late', 'excused')),
  ADD COLUMN IF NOT EXISTS attendance_recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS attendance_recorded_by uuid REFERENCES public.profiles(id);

-- 5. RESULTADOS -----------------------------------------------------------
CREATE TABLE public.activity_results (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  booking_id  uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  team        text,
  position    integer CHECK (position >= 1),
  score       numeric,
  details     jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_by uuid REFERENCES public.profiles(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CHECK (booking_id IS NOT NULL OR team IS NOT NULL)
);
CREATE INDEX activity_results_session ON public.activity_results (session_id);

ALTER TABLE public.activity_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_results_organizer" ON public.activity_results FOR ALL
  USING (session_id IN (SELECT id FROM public.sessions WHERE professional_id = public._profile_id()))
  WITH CHECK (session_id IN (SELECT id FROM public.sessions WHERE professional_id = public._profile_id()));
CREATE POLICY "activity_results_own_read" ON public.activity_results FOR SELECT
  USING (booking_id IN (SELECT id FROM public.bookings WHERE student_id = public._profile_id()));

-- 6. BACKFILL (sem mexer em updated_at) -----------------------------------
ALTER TABLE public.sessions DISABLE TRIGGER sessions_updated_at;
ALTER TABLE public.bookings DISABLE TRIGGER bookings_updated_at;

SELECT public.ensure_solo_organization(p.id)
FROM public.profiles p
WHERE p.role = 'professional'
   OR p.id IN (SELECT professional_id FROM public.sessions);

UPDATE public.sessions s
SET organization_id = o.id
FROM public.organizations o
WHERE o.kind = 'solo' AND o.created_by = s.professional_id AND s.organization_id IS NULL;

UPDATE public.sessions s
SET venue_id = public.resolve_venue(s.organization_id, s.location_name, s.location_address,
                                    s.latitude, s.longitude, s.location_type, s.city, s.professional_id)
WHERE s.venue_id IS NULL;

UPDATE public.bookings
SET attendance_status = CASE WHEN checked_in THEN 'present' ELSE 'absent' END,
    attendance_recorded_at = coalesce(checked_in_at, updated_at),
    attendance_recorded_by = professional_id
WHERE attendance_status IS NULL AND (checked_in OR status = 'no_show');

ALTER TABLE public.sessions ENABLE TRIGGER sessions_updated_at;
ALTER TABLE public.bookings ENABLE TRIGGER bookings_updated_at;

-- 7. TRIGGERS: daqui para frente, automático ------------------------------
-- Organizador novo (ou que virou organizador) ganha a organização solo.
CREATE OR REPLACE FUNCTION public.profile_ensure_solo_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.role = 'professional' AND NEW.deleted_at IS NULL THEN
    PERFORM public.ensure_solo_organization(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.profile_ensure_solo_org() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER profile_ensure_solo_org AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profile_ensure_solo_org();

-- Conta excluída: sai das organizações.
CREATE OR REPLACE FUNCTION public.profile_deleted_leave_orgs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.organization_members SET status = 'removed' WHERE profile_id = NEW.id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.profile_deleted_leave_orgs() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER profile_deleted_leave_orgs AFTER UPDATE OF deleted_at ON public.profiles
  FOR EACH ROW WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION public.profile_deleted_leave_orgs();

-- Atividade: organização e local preenchidos a partir dos campos que o app envia.
CREATE OR REPLACE FUNCTION public.session_link_org_venue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.ensure_solo_organization(NEW.professional_id);
  END IF;

  IF NEW.venue_id IS NULL
     OR (TG_OP = 'UPDATE'
         AND NEW.venue_id IS NOT DISTINCT FROM OLD.venue_id
         AND (NEW.location_name IS DISTINCT FROM OLD.location_name
              OR NEW.location_address IS DISTINCT FROM OLD.location_address))
  THEN
    NEW.venue_id := public.resolve_venue(NEW.organization_id, NEW.location_name, NEW.location_address,
                                         NEW.latitude, NEW.longitude, NEW.location_type, NEW.city,
                                         NEW.professional_id);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.session_link_org_venue() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER session_link_org_venue
  BEFORE INSERT OR UPDATE OF location_name, location_address, organization_id, venue_id ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.session_link_org_venue();

-- Presença: acompanha o check-in e o no_show que o close_session já grava;
-- o organizador também pode gravar attendance_status direto (atrasado, justificado).
CREATE OR REPLACE FUNCTION public.sync_booking_attendance()
RETURNS trigger LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.attendance_status IS NOT DISTINCT FROM OLD.attendance_status THEN
    IF NEW.checked_in IS DISTINCT FROM OLD.checked_in OR NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.checked_in THEN
        NEW.attendance_status := 'present';
      ELSIF NEW.status = 'no_show' THEN
        NEW.attendance_status := 'absent';
      END IF;
    END IF;
  ELSIF NEW.attendance_status IN ('present', 'late') AND NOT coalesce(NEW.checked_in, false) THEN
    NEW.checked_in := true;
    NEW.checked_in_at := coalesce(NEW.checked_in_at, now());
  END IF;

  IF NEW.attendance_status IS DISTINCT FROM OLD.attendance_status THEN
    NEW.attendance_recorded_at := now();
    NEW.attendance_recorded_by := public._profile_id();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_booking_attendance() FROM PUBLIC, anon, authenticated;
-- Nome com "s": roda depois de guard_booking_update (ordem alfabética).
CREATE TRIGGER sync_booking_attendance BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_booking_attendance();

-- Participante não altera a própria presença.
CREATE OR REPLACE FUNCTION public.guard_booking_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_caller text;
  v_profile_id uuid;
  v_is_student boolean;
  v_is_pro boolean;
BEGIN
  v_caller := current_user;

  -- Let SECURITY DEFINER functions, service_role, and superuser pass through
  IF v_caller NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- Immutable fields: never change these
  IF NEW.session_id     IS DISTINCT FROM OLD.session_id OR
     NEW.student_id     IS DISTINCT FROM OLD.student_id OR
     NEW.professional_id IS DISTINCT FROM OLD.professional_id OR
     NEW.amount_total   IS DISTINCT FROM OLD.amount_total OR
     NEW.platform_fee   IS DISTINCT FROM OLD.platform_fee OR
     NEW.professional_payout IS DISTINCT FROM OLD.professional_payout
  THEN
    RAISE EXCEPTION 'forbidden_field_change' USING ERRCODE = '42501';
  END IF;

  SELECT public._profile_id() INTO v_profile_id;
  v_is_student := (OLD.student_id = v_profile_id);
  v_is_pro     := (OLD.professional_id = v_profile_id);

  IF v_is_student AND NOT v_is_pro THEN
    -- Student: can only cancel (pending/confirmed -> cancelled_by_student)
    -- Cannot change payment_status, checked_in, attendance or "un-cancel"
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status OR
       NEW.checked_in     IS DISTINCT FROM OLD.checked_in OR
       NEW.attendance_status      IS DISTINCT FROM OLD.attendance_status OR
       NEW.attendance_recorded_at IS DISTINCT FROM OLD.attendance_recorded_at OR
       NEW.attendance_recorded_by IS DISTINCT FROM OLD.attendance_recorded_by
    THEN
      RAISE EXCEPTION 'student_forbidden_field' USING ERRCODE = '42501';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status NOT IN ('pending', 'confirmed') OR NEW.status != 'cancelled_by_student' THEN
        RAISE EXCEPTION 'invalid_status_transition' USING ERRCODE = '42501';
      END IF;

      -- 4-hour cancellation rule (server-side enforcement)
      IF (SELECT (s.date + s.start_time) FROM public.sessions s WHERE s.id = OLD.session_id) - interval '4 hours' < now() THEN
        RAISE EXCEPTION 'late_cancellation' USING ERRCODE = 'P0001';
      END IF;
    END IF;

  ELSIF v_is_pro AND NOT v_is_student THEN
    -- Pro: can confirm payment, mark presence, complete, no_show, cancel
    -- Allowed transitions handled by the RLS + RPC layer
    NULL; -- Pro has broader permissions, validated by RPCs

  ELSE
    -- Neither student nor pro of this booking
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_booking_update() FROM PUBLIC, anon, authenticated;

COMMIT;
