-- ============================================================
-- Esportes: lista mais completa e "não achei meu esporte"
-- ============================================================
-- Decisão do dono do produto (07/10/2026):
-- * Entram esportes comuns que faltavam na lista oficial.
-- * Quando o organizador não acha o esporte, publica na hora com o nome que
--   escreveu (sessions.sport_other, categoria "Outros"). O nome vira sugestão
--   para a equipe Riff, que pode promovê-lo a esporte oficial: as atividades
--   que usaram esse nome passam para a categoria nova automaticamente.
--   O organizador não cria categoria direto no catálogo (evita duplicatas,
--   erros de digitação e nomes inadequados).
-- ============================================================

BEGIN;

-- 1. Esportes que faltavam ------------------------------------------------------------
INSERT INTO public.categories (name, slug, emoji, icon, sort_order) VALUES
  ('Vôlei', 'volei-quadra', '🏐', 'activity', 53),
  ('Tênis de mesa', 'tenis-mesa', '🏓', 'activity', 54),
  ('Pickleball', 'pickleball', '🎾', 'activity', 55),
  ('Badminton', 'badminton', '🏸', 'activity', 56),
  ('Squash', 'squash', '🎾', 'activity', 57),
  ('Escalada', 'escalada', '🧗', 'map', 58),
  ('Remo e canoagem', 'remo-canoagem', '🚣', 'activity', 59),
  ('Kitesurf', 'kitesurf', '🪁', 'activity', 60),
  ('Atletismo', 'atletismo', '🏃', 'activity', 61),
  ('Triatlo', 'triatlo', '🏊', 'activity', 62),
  ('Karatê', 'karate', '🥋', 'activity', 63),
  ('Judô', 'judo', '🥋', 'activity', 64),
  ('Capoeira', 'capoeira', '🤸', 'activity', 65),
  ('Rugby', 'rugby', '🏉', 'activity', 66),
  ('Patinação', 'patinacao', '⛸️', 'activity', 67),
  ('Ultimate frisbee', 'ultimate', '🥏', 'activity', 68)
ON CONFLICT DO NOTHING;

-- 2. Nome livre do esporte ("não achei") ------------------------------------------------
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS sport_other text
  CHECK (sport_other IS NULL OR length(btrim(sport_other)) BETWEEN 2 AND 40);

-- Texto sem acento, minúsculo e com espaços simples (para juntar "Hóquei" e "hoquei ")
CREATE OR REPLACE FUNCTION public.plain_text(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT regexp_replace(btrim(lower(translate(coalesce(p, ''),
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ',
    'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn'))), '\s+', ' ', 'g')
$$;

-- 3. Equipe Riff (terminal): sugestões e promoção --------------------------------------
CREATE OR REPLACE FUNCTION public.admin_sport_suggestions()
RETURNS TABLE (name text, activities integer, organizers integer, first_seen date, last_seen date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT min(s.sport_other), count(*)::integer, count(DISTINCT s.professional_id)::integer, min(s.date), max(s.date)
  FROM public.sessions s
  WHERE s.sport_other IS NOT NULL
  GROUP BY public.plain_text(s.sport_other)
  ORDER BY count(*) DESC, min(s.sport_other)
$$;
REVOKE ALL ON FUNCTION public.admin_sport_suggestions() FROM PUBLIC, anon, authenticated;

-- Promove o nome a esporte oficial (ou junta com um que já existe, pelo slug)
-- e move as atividades que usaram esse nome. Devolve quantas mudaram.
CREATE OR REPLACE FUNCTION public.admin_promote_sport(p_name text, p_slug text, p_official_name text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_cat   uuid;
  v_moved integer;
BEGIN
  IF coalesce(btrim(p_slug), '') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'slug inválido (use letras minúsculas, números e hífen)';
  END IF;

  SELECT id INTO v_cat FROM public.categories WHERE slug = p_slug;
  IF v_cat IS NULL THEN
    INSERT INTO public.categories (name, slug, sort_order)
    VALUES (btrim(coalesce(nullif(p_official_name, ''), p_name)), p_slug,
            (SELECT coalesce(max(sort_order), 0) + 1 FROM public.categories WHERE sort_order < 999))
    RETURNING id INTO v_cat;
  END IF;

  UPDATE public.sessions
  SET category_id = v_cat, sport_other = NULL
  WHERE sport_other IS NOT NULL AND public.plain_text(sport_other) = public.plain_text(p_name);
  GET DIAGNOSTICS v_moved = ROW_COUNT;
  RETURN v_moved;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_promote_sport(text, text, text) FROM PUBLIC, anon, authenticated;

COMMIT;
