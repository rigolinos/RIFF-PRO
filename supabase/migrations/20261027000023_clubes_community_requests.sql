-- ============================================================
-- Riff Clubes: pedido de comunidade (o morador pede, a equipe Riff aprova)
-- ============================================================
-- Decisão do dono do produto (07/10/2026), etapa 1:
-- * Qualquer conta pode pedir o cadastro do seu condomínio ou clube por um
--   questionário (nome, tipo, endereço com coordenada, infraestrutura, número
--   de unidades, papel de quem pede e contato do síndico).
-- * Um condomínio por lugar: antes de enviar, o app procura comunidades e
--   pedidos num raio de 150 m. Se já existe comunidade, a pessoa pede para
--   entrar (o gestor aceita); se já existe pedido, ela registra interesse.
-- * O pedido fica pendente até a equipe Riff falar com o condomínio e
--   aprovar pelo terminal. Na aprovação, a comunidade nasce com a sede e os
--   espaços tirados da infraestrutura ("2 quadras de tênis" vira
--   "Quadra de tênis 1" e "Quadra de tênis 2").
-- * Comunidade provisória criada pelo próprio morador fica para a etapa 2.
-- ============================================================

BEGIN;

-- 1. Pedidos ---------------------------------------------------------------------------
CREATE TABLE public.community_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name             text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
  kind             text NOT NULL CHECK (kind IN ('condo', 'club')),
  address          text NOT NULL CHECK (length(btrim(address)) BETWEEN 3 AND 200),
  city             text,
  state            text,
  latitude         numeric(10,7) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude        numeric(10,7) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  infrastructure   jsonb NOT NULL DEFAULT '{}'::jsonb,
  units            integer CHECK (units IS NULL OR units BETWEEN 1 AND 50000),
  requester_role   text NOT NULL CHECK (requester_role IN ('sindico', 'administradora', 'funcionario', 'morador', 'socio', 'outro')),
  sindico_contact  text CHECK (sindico_contact IS NULL OR length(sindico_contact) <= 120),
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  organization_id  uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  review_note      text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  reviewed_at      timestamptz
);
CREATE INDEX community_requests_requester ON public.community_requests (requester_id);
CREATE INDEX community_requests_status ON public.community_requests (status);
ALTER TABLE public.community_requests ENABLE ROW LEVEL SECURITY;
-- quem pediu acompanha o próprio pedido; gravação só pelas funções
CREATE POLICY "community_requests_own_read" ON public.community_requests FOR SELECT
  USING (requester_id = (SELECT public._profile_id()));

-- Quem também quer o mesmo condomínio (sinal para a venda)
CREATE TABLE public.community_request_interest (
  request_id  uuid NOT NULL REFERENCES public.community_requests(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, profile_id)
);
CREATE INDEX community_request_interest_profile ON public.community_request_interest (profile_id);
ALTER TABLE public.community_request_interest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "community_request_interest_own_read" ON public.community_request_interest FOR SELECT
  USING (profile_id = (SELECT public._profile_id()));

-- Pedido para entrar numa comunidade que já existe
CREATE TABLE public.community_join_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  answered_at      timestamptz,
  answered_by      uuid REFERENCES public.profiles(id)
);
CREATE UNIQUE INDEX community_join_requests_one_pending ON public.community_join_requests (organization_id, profile_id) WHERE status = 'pending';
CREATE INDEX community_join_requests_profile ON public.community_join_requests (profile_id);
CREATE INDEX community_join_requests_answered_by ON public.community_join_requests (answered_by);
ALTER TABLE public.community_join_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "community_join_requests_read" ON public.community_join_requests FOR SELECT
  USING (profile_id = (SELECT public._profile_id())
         OR public.is_org_member(organization_id, ARRAY['owner', 'admin']));

-- 2. Distância em metros (fórmula de haversine) --------------------------------------------
CREATE OR REPLACE FUNCTION public.distance_m(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
RETURNS double precision LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT 2 * 6371000 * asin(sqrt(
    power(sin(radians((lat2 - lat1)::double precision) / 2), 2)
    + cos(radians(lat1::double precision)) * cos(radians(lat2::double precision))
      * power(sin(radians((lng2 - lng1)::double precision) / 2), 2)))
$$;

-- 3. O que já existe perto deste ponto (comunidades e pedidos pendentes, até 150 m) -----------
CREATE OR REPLACE FUNCTION public.communities_near(p_lat numeric, p_lng numeric)
RETURNS TABLE (type text, id uuid, name text, kind text, distance_m integer, is_member boolean, requested boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH me AS (SELECT public._profile_id() AS id)
  SELECT * FROM (
    SELECT 'community'::text, o.id, o.name, o.kind,
           round(public.distance_m(p_lat, p_lng, v.latitude, v.longitude))::integer,
           EXISTS (SELECT 1 FROM public.organization_members m, me
                   WHERE m.organization_id = o.id AND m.profile_id = me.id AND m.status = 'active'),
           EXISTS (SELECT 1 FROM public.community_join_requests j, me
                   WHERE j.organization_id = o.id AND j.profile_id = me.id AND j.status = 'pending')
    FROM public.organizations o
    JOIN public.venues v ON v.id = o.main_venue_id
    WHERE o.kind IN ('condo', 'club') AND v.latitude IS NOT NULL
      AND public.distance_m(p_lat, p_lng, v.latitude, v.longitude) <= 150
    UNION ALL
    SELECT 'request'::text, r.id, r.name, r.kind,
           round(public.distance_m(p_lat, p_lng, r.latitude, r.longitude))::integer,
           false,
           EXISTS (SELECT 1 FROM me WHERE r.requester_id = me.id)
             OR EXISTS (SELECT 1 FROM public.community_request_interest i, me WHERE i.request_id = r.id AND i.profile_id = me.id)
    FROM public.community_requests r
    WHERE r.status = 'pending'
      AND public.distance_m(p_lat, p_lng, r.latitude, r.longitude) <= 150
  ) x
  WHERE (SELECT id FROM me) IS NOT NULL
  ORDER BY 5
  LIMIT 5
$$;
REVOKE ALL ON FUNCTION public.communities_near(numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.communities_near(numeric, numeric) TO authenticated;

-- 4. Enviar o pedido ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_community_request(
  p_name            text,
  p_kind            text,
  p_address         text,
  p_city            text,
  p_state           text,
  p_lat             numeric,
  p_lng             numeric,
  p_infrastructure  jsonb,
  p_units           integer,
  p_requester_role  text,
  p_sindico_contact text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_me    uuid := public._profile_id();
  v_infra jsonb := '{}'::jsonb;
  v_key   text;
  v_val   jsonb;
  v_id    uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL THEN
    RAISE EXCEPTION 'address_required';
  END IF;
  IF (SELECT count(*) FROM public.community_requests WHERE requester_id = v_me AND status = 'pending') >= 3 THEN
    RAISE EXCEPTION 'too_many_requests';
  END IF;
  IF EXISTS (SELECT 1 FROM public.communities_near(p_lat, p_lng) WHERE type = 'community') THEN
    RAISE EXCEPTION 'community_exists';
  END IF;
  IF EXISTS (SELECT 1 FROM public.communities_near(p_lat, p_lng) WHERE type = 'request') THEN
    RAISE EXCEPTION 'request_exists';
  END IF;

  -- infraestrutura: só tipos de espaço conhecidos, de 1 a 20 de cada
  FOR v_key, v_val IN SELECT * FROM jsonb_each(coalesce(p_infrastructure, '{}'::jsonb)) LOOP
    IF v_key IN ('tennis', 'beach_tennis', 'padel', 'multi_court', 'soccer', 'volleyball', 'basketball',
                 'pool', 'gym', 'hall', 'playground', 'track', 'other')
       AND jsonb_typeof(v_val) = 'number' AND (v_val)::text::numeric BETWEEN 1 AND 20 THEN
      v_infra := v_infra || jsonb_build_object(v_key, floor((v_val)::text::numeric)::integer);
    END IF;
  END LOOP;

  INSERT INTO public.community_requests (requester_id, name, kind, address, city, state, latitude, longitude,
                                         infrastructure, units, requester_role, sindico_contact)
  VALUES (v_me, regexp_replace(btrim(p_name), '\s+', ' ', 'g'), p_kind, btrim(p_address),
          nullif(btrim(coalesce(p_city, '')), ''), nullif(upper(btrim(coalesce(p_state, ''))), ''),
          p_lat, p_lng, v_infra, p_units, p_requester_role, nullif(btrim(coalesce(p_sindico_contact, '')), ''))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_community_request(text, text, text, text, text, numeric, numeric, jsonb, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_community_request(text, text, text, text, text, numeric, numeric, jsonb, integer, text, text) TO authenticated;

-- Quem pediu desiste (só enquanto pendente)
CREATE OR REPLACE FUNCTION public.cancel_community_request(p_request uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.community_requests SET status = 'cancelled', reviewed_at = now()
  WHERE id = p_request AND requester_id = public._profile_id() AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_community_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_community_request(uuid) TO authenticated;

-- "Eu também quero": interesse num pedido que já existe
CREATE OR REPLACE FUNCTION public.support_community_request(p_request uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_me uuid := public._profile_id();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_requests WHERE id = p_request AND status = 'pending') THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;
  INSERT INTO public.community_request_interest (request_id, profile_id) VALUES (p_request, v_me)
  ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.support_community_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.support_community_request(uuid) TO authenticated;

-- 5. Pedir para entrar e o gestor responder ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_to_join(p_org uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_me uuid := public._profile_id();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org AND kind IN ('condo', 'club')) THEN
    RAISE EXCEPTION 'community_not_found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = p_org AND profile_id = v_me AND status = 'active') THEN
    RAISE EXCEPTION 'already_member';
  END IF;
  INSERT INTO public.community_join_requests (organization_id, profile_id) VALUES (p_org, v_me)
  ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.request_to_join(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_to_join(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.answer_join_request(p_request uuid, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_req record;
BEGIN
  SELECT id, organization_id, profile_id INTO v_req FROM public.community_join_requests
  WHERE id = p_request AND status = 'pending';
  IF v_req.id IS NULL OR NOT public.is_org_member(v_req.organization_id, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.community_join_requests
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
      answered_at = now(), answered_by = public._profile_id()
  WHERE id = p_request;

  IF p_accept THEN
    INSERT INTO public.organization_members (organization_id, profile_id, role)
    VALUES (v_req.organization_id, v_req.profile_id, 'member')
    ON CONFLICT (organization_id, profile_id) DO UPDATE SET status = 'active', role = 'member';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.answer_join_request(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.answer_join_request(uuid, boolean) TO authenticated;

-- 6. Equipe Riff (terminal): listar, aprovar, recusar ------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_community_requests(p_status text DEFAULT 'pending')
RETURNS TABLE (id uuid, created_at timestamptz, name text, kind text, address text, city text, state text,
               infrastructure jsonb, units integer, requester_role text, requester_name text, requester_email text,
               sindico_contact text, interested integer, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT r.id, r.created_at, r.name, r.kind, r.address, r.city, r.state, r.infrastructure, r.units, r.requester_role,
         p.full_name, u.email::text, r.sindico_contact,
         (SELECT count(*)::integer FROM public.community_request_interest i WHERE i.request_id = r.id),
         r.status
  FROM public.community_requests r
  JOIN public.profiles p ON p.id = r.requester_id
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE p_status IS NULL OR r.status = p_status
  ORDER BY r.created_at
$$;
REVOKE ALL ON FUNCTION public.admin_list_community_requests(text) FROM PUBLIC, anon, authenticated;

-- Nome do espaço a partir do tipo ("Quadra de tênis 2")
CREATE OR REPLACE FUNCTION public.space_label(p_kind text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT CASE p_kind
    WHEN 'tennis' THEN 'Quadra de tênis'
    WHEN 'beach_tennis' THEN 'Quadra de beach tennis'
    WHEN 'padel' THEN 'Quadra de padel'
    WHEN 'multi_court' THEN 'Quadra poliesportiva'
    WHEN 'soccer' THEN 'Campo de futebol'
    WHEN 'volleyball' THEN 'Quadra de vôlei'
    WHEN 'basketball' THEN 'Quadra de basquete'
    WHEN 'pool' THEN 'Piscina'
    WHEN 'gym' THEN 'Academia'
    WHEN 'hall' THEN 'Salão'
    WHEN 'playground' THEN 'Playground'
    WHEN 'track' THEN 'Pista de caminhada'
    ELSE 'Espaço'
  END
$$;

-- Aprovar: cria a comunidade com a sede e os espaços. O responsável é quem a
-- equipe confirmou (e-mail); sem e-mail, é quem pediu. Quem pediu entra como membro.
CREATE OR REPLACE FUNCTION public.admin_approve_community_request(p_request uuid, p_owner_email text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_req   record;
  v_email text;
  v_org   uuid;
  v_key   text;
  v_n     integer;
  v_i     integer;
BEGIN
  SELECT * INTO v_req FROM public.community_requests WHERE id = p_request AND status = 'pending';
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'pedido não encontrado ou já respondido';
  END IF;

  v_email := nullif(btrim(coalesce(p_owner_email, '')), '');
  IF v_email IS NULL THEN
    SELECT u.email INTO v_email FROM public.profiles p JOIN auth.users u ON u.id = p.user_id WHERE p.id = v_req.requester_id;
  END IF;

  v_org := public.admin_create_community(v_req.name, v_req.kind, v_email, v_req.address, v_req.city, v_req.state,
                                         v_req.latitude, v_req.longitude);

  -- espaços a partir da infraestrutura informada
  FOR v_key, v_n IN SELECT key, value::text::integer FROM jsonb_each(v_req.infrastructure) LOOP
    FOR v_i IN 1..v_n LOOP
      INSERT INTO public.venues (organization_id, name, kind, official, space_kind, visibility, created_by)
      VALUES (v_org, public.space_label(v_key) || CASE WHEN v_n > 1 THEN ' ' || v_i ELSE '' END,
              'other', true, v_key, 'members', v_req.requester_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- quem pediu entra como membro (se não for o responsável)
  INSERT INTO public.organization_members (organization_id, profile_id, role)
  VALUES (v_org, v_req.requester_id, 'member')
  ON CONFLICT (organization_id, profile_id) DO NOTHING;

  UPDATE public.community_requests SET status = 'approved', organization_id = v_org, reviewed_at = now()
  WHERE id = p_request;
  RETURN v_org;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_approve_community_request(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_reject_community_request(p_request uuid, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.community_requests SET status = 'rejected', review_note = p_note, reviewed_at = now()
  WHERE id = p_request AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pedido não encontrado ou já respondido';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_reject_community_request(uuid, text) FROM PUBLIC, anon, authenticated;

COMMIT;
