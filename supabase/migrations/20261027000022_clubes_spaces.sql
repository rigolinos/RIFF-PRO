-- ============================================================
-- Riff Clubes: espaços da comunidade
-- ============================================================
-- Decisão do dono do produto (07/10/2026): a dor dos condomínios é a disputa
-- por espaço (duas turmas na mesma quadra). O gestor mantém a lista oficial
-- de espaços (quadra, piscina, salão…); quem cria um evento escolhe dela, o
-- app avisa se já há algo no mesmo espaço e horário, e a agenda filtra por
-- espaço. Espaço é um local (venues) da comunidade com official = true; o
-- local digitado à mão continua valendo (official = false).
-- ============================================================

BEGIN;

-- 1. Espaço oficial -----------------------------------------------------------------
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS official    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS space_kind  text CHECK (space_kind IN (
    'tennis', 'beach_tennis', 'padel', 'multi_court', 'soccer', 'volleyball', 'basketball',
    'pool', 'gym', 'hall', 'playground', 'track', 'other')),
  ADD COLUMN IF NOT EXISTS rules       text CHECK (rules IS NULL OR length(rules) <= 500),
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- 2. Gestor cria, edita e arquiva espaços --------------------------------------------
-- Um local já usado com o mesmo nome (digitado à mão) vira oficial: o histórico fica.
CREATE OR REPLACE FUNCTION public.save_community_space(
  p_org        uuid,
  p_space      uuid,
  p_name       text,
  p_space_kind text,
  p_rules      text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_me    uuid := public._profile_id();
  v_kind  text;
  v_space uuid := p_space;
  v_name  text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
BEGIN
  SELECT kind INTO v_kind FROM public.organizations WHERE id = p_org;
  IF v_kind NOT IN ('condo', 'club') OR NOT public.is_org_member(p_org, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF length(v_name) < 2 OR length(v_name) > 60 THEN
    RAISE EXCEPTION 'space_name_invalid';
  END IF;

  -- outro espaço da comunidade com o mesmo nome?
  IF EXISTS (
    SELECT 1 FROM public.venues
    WHERE organization_id = p_org AND official AND archived_at IS NULL
      AND lower(name) = lower(v_name) AND id IS DISTINCT FROM v_space
  ) THEN
    RAISE EXCEPTION 'space_name_taken';
  END IF;

  IF v_space IS NOT NULL THEN
    UPDATE public.venues
    SET name = v_name, space_kind = p_space_kind, rules = nullif(btrim(coalesce(p_rules, '')), '')
    WHERE id = v_space AND organization_id = p_org AND official;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'space_not_found';
    END IF;
    RETURN v_space;
  END IF;

  -- local já usado com esse nome (sem endereço) vira o espaço oficial
  SELECT id INTO v_space FROM public.venues
  WHERE organization_id = p_org AND lower(btrim(name)) = lower(v_name) AND coalesce(address, '') = ''
  LIMIT 1;

  IF v_space IS NOT NULL THEN
    UPDATE public.venues
    SET official = true, archived_at = NULL, name = v_name, space_kind = p_space_kind,
        rules = nullif(btrim(coalesce(p_rules, '')), ''), visibility = 'members'
    WHERE id = v_space;
  ELSE
    INSERT INTO public.venues (organization_id, name, kind, official, space_kind, rules, visibility, created_by)
    VALUES (p_org, v_name, 'other', true, p_space_kind, nullif(btrim(coalesce(p_rules, '')), ''), 'members', v_me)
    RETURNING id INTO v_space;
  END IF;
  RETURN v_space;
END;
$$;
REVOKE ALL ON FUNCTION public.save_community_space(uuid, uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_community_space(uuid, uuid, text, text, text) TO authenticated;

-- Arquivar: some da lista; as atividades antigas continuam ligadas a ele
CREATE OR REPLACE FUNCTION public.archive_community_space(p_space uuid, p_archive boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.venues WHERE id = p_space AND official;
  IF v_org IS NULL OR NOT public.is_org_member(v_org, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.venues SET archived_at = CASE WHEN p_archive THEN now() END WHERE id = p_space;
END;
$$;
REVOKE ALL ON FUNCTION public.archive_community_space(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_community_space(uuid, boolean) TO authenticated;

-- 3. Conflito de horário no mesmo espaço (só membros da comunidade) -----------------
CREATE OR REPLACE FUNCTION public.space_conflicts(
  p_space   uuid,
  p_date    date,
  p_start   time,
  p_minutes integer,
  p_exclude uuid DEFAULT NULL
)
RETURNS TABLE (session_id uuid, title text, start_time time, end_time time)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.venues WHERE id = p_space;
  IF v_org IS NULL OR NOT public.is_org_member(v_org) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT s.id, s.title, s.start_time,
         (s.start_time + make_interval(mins => coalesce(s.duration_minutes, 60)))::time
  FROM public.sessions s
  WHERE s.venue_id = p_space AND s.date = p_date
    AND s.status NOT IN ('cancelled', 'draft')
    AND s.id IS DISTINCT FROM p_exclude
    -- sobreposição: começa antes de o outro terminar e termina depois de o outro começar
    AND (p_date + p_start) < (s.date + s.start_time + make_interval(mins => coalesce(s.duration_minutes, 60)))
    AND (s.date + s.start_time) < (p_date + p_start + make_interval(mins => coalesce(p_minutes, 60)))
  ORDER BY s.start_time;
END;
$$;
REVOKE ALL ON FUNCTION public.space_conflicts(uuid, date, time, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.space_conflicts(uuid, date, time, integer, uuid) TO authenticated;

-- 4. Atividade só usa espaço da própria comunidade ----------------------------------
-- Roda depois de session_link_org_venue e session_product_rules (ordem alfabética).
CREATE OR REPLACE FUNCTION public.session_venue_same_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_org uuid;
BEGIN
  IF NEW.venue_id IS NOT NULL THEN
    SELECT organization_id INTO v_org FROM public.venues WHERE id = NEW.venue_id;
    IF v_org IS DISTINCT FROM NEW.organization_id THEN
      RAISE EXCEPTION 'venue_other_organization' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.session_venue_same_org() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS session_venue_same_org ON public.sessions;
CREATE TRIGGER session_venue_same_org
  BEFORE INSERT OR UPDATE OF venue_id, organization_id ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.session_venue_same_org();

COMMIT;
