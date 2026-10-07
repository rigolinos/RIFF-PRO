-- ============================================================
-- Mapa, Fase 0: coordenada de cada local e ponto de encontro
-- ============================================================
-- Decisão do dono do produto (07/10/2026): antes de qualquer mapa, gravar a
-- coordenada certa de cada atividade ("registrar tudo, expor pouco"). O
-- organizador escolhe o endereço numa busca (Geoapify, que permite guardar o
-- resultado) e o participante ganha o "Como chegar". Sem mapa na tela agora.
-- * O local (venues) guarda a coordenada; a atividade herda a do local, e um
--   local antigo sem coordenada aproveita a primeira que chegar.
-- * sessions.meeting_point: o ponto de encontro ("perto do chafariz") fica
--   fora do nome do local, para não criar locais repetidos.
-- ============================================================

BEGIN;

-- 1. Ponto de encontro e coordenadas válidas ------------------------------------
-- (NOT VALID: vale para o que for gravado daqui para frente, sem travar a
-- migration por algum dado antigo)
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS meeting_point text
  CHECK (meeting_point IS NULL OR length(meeting_point) <= 120);

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_coordinates_valid
  CHECK ((latitude IS NULL) = (longitude IS NULL)
         AND coalesce(latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180, true)) NOT VALID;
ALTER TABLE public.venues
  ADD CONSTRAINT venues_coordinates_valid
  CHECK ((latitude IS NULL) = (longitude IS NULL)
         AND coalesce(latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180, true)) NOT VALID;

-- 2. Local existente sem coordenada aproveita a nova -----------------------------
-- (corpo igual ao de 20261027000009 + preenchimento da coordenada)
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
  ELSIF p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
    UPDATE public.venues SET latitude = p_lat, longitude = p_lng
    WHERE id = v_venue AND latitude IS NULL;
  END IF;
  RETURN v_venue;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_venue(uuid, text, text, numeric, numeric, text, text, uuid) FROM PUBLIC, anon, authenticated;

-- 3. Atividade herda a coordenada do local --------------------------------------
-- (corpo igual ao de 20261027000004 + coordenadas; o trigger passa a olhar
-- também latitude e longitude)
CREATE OR REPLACE FUNCTION public.session_link_org_venue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_lat numeric;
  v_lng numeric;
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

  IF NEW.venue_id IS NOT NULL THEN
    IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
      SELECT latitude, longitude INTO v_lat, v_lng FROM public.venues WHERE id = NEW.venue_id;
      IF v_lat IS NOT NULL AND v_lng IS NOT NULL THEN
        NEW.latitude := v_lat;
        NEW.longitude := v_lng;
      END IF;
    ELSE
      UPDATE public.venues SET latitude = NEW.latitude, longitude = NEW.longitude
      WHERE id = NEW.venue_id AND latitude IS NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.session_link_org_venue() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS session_link_org_venue ON public.sessions;
CREATE TRIGGER session_link_org_venue
  BEFORE INSERT OR UPDATE OF location_name, location_address, organization_id, venue_id, latitude, longitude ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.session_link_org_venue();

COMMIT;
