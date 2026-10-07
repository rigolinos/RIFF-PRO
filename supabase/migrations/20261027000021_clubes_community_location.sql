-- ============================================================
-- Riff Clubes: localização da comunidade (sede) e retrato para a equipe Riff
-- ============================================================
-- Decisão do dono do produto (07/10/2026): guardar onde fica cada condomínio
-- ou clube desde o cadastro ("registrar tudo, expor pouco"). Com isso e com
-- as atividades já registradas, a equipe Riff sabe onde estão as comunidades,
-- que esportes praticam e onde falta instrutor (ponte com o Riff Pro).
-- Cuidados:
-- * A sede é um local (venues) com visibility = 'members': só membros da
--   própria comunidade a enxergam. Nunca aparece no Pro nem para outras
--   comunidades.
-- * O retrato (admin_community_insights) é só da equipe Riff, pelo terminal.
--   Dependentes aparecem só como faixa ("menos de 5") para não identificar
--   menores. Uso fora da comunidade, só agregado e anônimo (por bairro ou
--   cidade), conforme os termos do Clubes.
-- ============================================================

BEGIN;

-- 1. Sede da comunidade ------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS main_venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL;

-- Grava ou atualiza a sede (equipe Riff, pelo terminal)
CREATE OR REPLACE FUNCTION public.admin_set_community_location(
  p_org     uuid,
  p_address text,
  p_city    text,
  p_state   text,
  p_lat     numeric,
  p_lng     numeric
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_org   record;
  v_venue uuid;
BEGIN
  SELECT id, name, kind, created_by, main_venue_id INTO v_org FROM public.organizations WHERE id = p_org;
  IF v_org.id IS NULL OR v_org.kind NOT IN ('condo', 'club') THEN
    RAISE EXCEPTION 'comunidade não encontrada (precisa ser condo ou club)';
  END IF;
  IF coalesce(btrim(p_address), '') = '' THEN
    RAISE EXCEPTION 'endereço obrigatório';
  END IF;
  IF (p_lat IS NULL) <> (p_lng IS NULL) THEN
    RAISE EXCEPTION 'informe latitude e longitude juntas';
  END IF;

  v_venue := v_org.main_venue_id;
  IF v_venue IS NULL THEN
    -- reaproveita um local da comunidade com o mesmo nome e endereço, se houver
    SELECT id INTO v_venue FROM public.venues
    WHERE organization_id = p_org
      AND lower(btrim(name)) = lower(btrim(v_org.name))
      AND lower(btrim(coalesce(address, ''))) = lower(btrim(p_address));
  END IF;

  IF v_venue IS NULL THEN
    INSERT INTO public.venues (organization_id, name, kind, address, city, state, latitude, longitude, visibility, created_by)
    VALUES (p_org, v_org.name, v_org.kind, btrim(p_address), nullif(btrim(coalesce(p_city, '')), ''),
            nullif(upper(btrim(coalesce(p_state, ''))), ''), p_lat, p_lng, 'members', v_org.created_by)
    RETURNING id INTO v_venue;
  ELSE
    UPDATE public.venues
    SET address = btrim(p_address),
        city = nullif(btrim(coalesce(p_city, '')), ''),
        state = nullif(upper(btrim(coalesce(p_state, ''))), ''),
        latitude = p_lat,
        longitude = p_lng,
        visibility = 'members'
    WHERE id = v_venue;
  END IF;

  UPDATE public.organizations SET main_venue_id = v_venue WHERE id = p_org;
  RETURN v_venue;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_community_location(uuid, text, text, text, numeric, numeric) FROM PUBLIC, anon, authenticated;

-- 2. Criar comunidade já com a localização ----------------------------------------
-- (corpo igual ao de 20261027000009 + sede opcional; a chamada antiga, só com
-- nome, tipo e e-mail, continua funcionando)
DROP FUNCTION IF EXISTS public.admin_create_community(text, text, text);
CREATE OR REPLACE FUNCTION public.admin_create_community(
  p_name        text,
  p_kind        text,
  p_owner_email text,
  p_address     text    DEFAULT NULL,
  p_city        text    DEFAULT NULL,
  p_state       text    DEFAULT NULL,
  p_lat         numeric DEFAULT NULL,
  p_lng         numeric DEFAULT NULL
)
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

  IF coalesce(btrim(p_address), '') <> '' THEN
    PERFORM public.admin_set_community_location(v_org, p_address, p_city, p_state, p_lat, p_lng);
  END IF;
  RETURN v_org;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_create_community(text, text, text, text, text, text, numeric, numeric) FROM PUBLIC, anon, authenticated;

-- 3. Retrato das comunidades (só a equipe Riff, pelo terminal) -----------------------
-- Por comunidade: onde fica, membros, atividades e quem jogou no período, e os
-- esportes e tipos de atividade. Dependentes só em faixa, para não identificar menores.
CREATE OR REPLACE FUNCTION public.admin_community_insights(p_days integer DEFAULT 90)
RETURNS TABLE (
  organization_id uuid,
  name            text,
  kind            text,
  city            text,
  state           text,
  address         text,
  latitude        numeric,
  longitude       numeric,
  members         bigint,
  activities      bigint,
  players         bigint,
  dependents      text,
  sports          jsonb,
  kinds           jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH period AS (
    SELECT s.id, s.organization_id, s.category_id, s.kind
    FROM public.sessions s
    WHERE s.product = 'clubes' AND s.status <> 'cancelled'
      AND s.date >= (public.now_sp()::date - p_days)
      AND s.date <= public.now_sp()::date
  ),
  played AS (
    SELECT p.organization_id, b.student_id, b.dependent_id
    FROM period p
    JOIN public.bookings b ON b.session_id = p.id
    WHERE b.status IN ('pending', 'confirmed', 'completed')
      AND coalesce(b.attendance_status, 'present') IN ('present', 'late')
  )
  SELECT
    o.id, o.name, o.kind, v.city, v.state, v.address, v.latitude, v.longitude,
    (SELECT count(*) FROM public.organization_members m WHERE m.organization_id = o.id AND m.status = 'active'),
    (SELECT count(*) FROM period p WHERE p.organization_id = o.id),
    (SELECT count(DISTINCT pl.student_id) FROM played pl WHERE pl.organization_id = o.id AND pl.dependent_id IS NULL),
    (SELECT CASE WHEN count(DISTINCT pl.dependent_id) = 0 THEN '0'
                 WHEN count(DISTINCT pl.dependent_id) < 5 THEN 'menos de 5'
                 ELSE count(DISTINCT pl.dependent_id)::text END
       FROM played pl WHERE pl.organization_id = o.id AND pl.dependent_id IS NOT NULL),
    (SELECT coalesce(jsonb_agg(jsonb_build_object('sport', x.name, 'activities', x.n) ORDER BY x.n DESC), '[]'::jsonb)
       FROM (SELECT c.name, count(*) AS n FROM period p JOIN public.categories c ON c.id = p.category_id
             WHERE p.organization_id = o.id GROUP BY c.name) x),
    (SELECT coalesce(jsonb_object_agg(x.kind, x.n), '{}'::jsonb)
       FROM (SELECT p.kind, count(*) AS n FROM period p WHERE p.organization_id = o.id GROUP BY p.kind) x)
  FROM public.organizations o
  LEFT JOIN public.venues v ON v.id = o.main_venue_id
  WHERE o.kind IN ('condo', 'club')
  ORDER BY o.name
$$;
REVOKE ALL ON FUNCTION public.admin_community_insights(integer) FROM PUBLIC, anon, authenticated;

COMMIT;
