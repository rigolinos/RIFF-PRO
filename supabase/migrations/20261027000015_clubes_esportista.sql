-- ============================================================
-- Riff Clubes (G1): o lado esportista
-- ============================================================
-- Decisão do dono do produto (05/10/2026): competição saudável dentro da
-- comunidade fechada. Sem rede aberta e sem ranking geral.
-- * Depois do jogo, quem jogou responde "como foi" (1 a 3) e dá elogios só
--   positivos a quem jogou junto (craque, fair play, pontual, bom de grupo,
--   animou). Ninguém vê quem deu o elogio.
-- * Perfil esportista: jogos, frequência, esportes, locais, elogios recebidos
--   e conquistas, visível para membros da mesma comunidade.
-- * Ranking do mês por comunidade: presença 10, organizou evento que aconteceu
--   com 3+ presentes 15, elogio recebido 3 (até 3 por jogo), avaliou 2.
-- * Modo reservado (profiles.sports_hidden): a pessoa some do ranking, ninguém
--   abre o perfil dela, não recebe elogios e aparece como "Membro" em "quem
--   vai". Os dados continuam gravados e ela vê os próprios números.
-- * Menores (dependentes) ficam fora de tudo isso.
-- * "Jogou" = inscrito (sem dependente), não cancelado, não marcado como
--   ausente ou justificado, e o evento já terminou.
-- ============================================================

BEGIN;

-- 1. Modo reservado -----------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN sports_hidden boolean NOT NULL DEFAULT false;

-- 2. Apoio ---------------------------------------------------------------------
-- Agora no horário de São Paulo (datas e horas das atividades são locais)
CREATE OR REPLACE FUNCTION public.now_sp()
RETURNS timestamp LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT (now() AT TIME ZONE 'America/Sao_Paulo') $$;

-- Fim da atividade (sem duração, conta 60 min)
CREATE OR REPLACE FUNCTION public.session_end_local(p_date date, p_time time, p_minutes integer)
RETURNS timestamp LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$ SELECT p_date + p_time + make_interval(mins => coalesce(p_minutes, 60)) $$;

-- "Marina Souza Lima" -> "Marina L."
CREATE OR REPLACE FUNCTION public.short_name(p_full text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_full IS NULL OR btrim(p_full) = '' THEN 'Membro'
    WHEN array_length(regexp_split_to_array(btrim(p_full), '\s+'), 1) = 1 THEN btrim(p_full)
    ELSE split_part(btrim(p_full), ' ', 1) || ' ' ||
         left((regexp_split_to_array(btrim(p_full), '\s+'))[array_length(regexp_split_to_array(btrim(p_full), '\s+'), 1)], 1) || '.'
  END
$$;

-- A pessoa jogou esta atividade do Clubes? (uso interno das funções abaixo)
CREATE OR REPLACE FUNCTION public.played_session(p_session uuid, p_profile uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.sessions s ON s.id = b.session_id
    WHERE b.session_id = p_session
      AND b.student_id = p_profile
      AND b.dependent_id IS NULL
      AND b.status IN ('pending', 'confirmed', 'completed')
      AND coalesce(b.attendance_status, 'present') IN ('present', 'late')
      AND s.product <> 'pro'
      AND s.status <> 'cancelled'
      AND public.session_end_local(s.date, s.start_time, s.duration_minutes) <= public.now_sp()
  )
$$;
REVOKE ALL ON FUNCTION public.played_session(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Jogos da pessoa (numa comunidade, ou em todas do Clubes), uso interno
CREATE OR REPLACE FUNCTION public.player_games(p_profile uuid, p_org uuid)
RETURNS TABLE (session_id uuid, category_id uuid, venue_name text, d date, att text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT s.id, s.category_id, coalesce(v.name, s.location_name), s.date, b.attendance_status
  FROM public.bookings b
  JOIN public.sessions s ON s.id = b.session_id
  LEFT JOIN public.venues v ON v.id = s.venue_id
  WHERE b.student_id = p_profile AND b.dependent_id IS NULL
    AND (p_org IS NULL OR s.organization_id = p_org)
    AND public.played_session(s.id, p_profile)
$$;
REVOKE ALL ON FUNCTION public.player_games(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- 3. Como foi e elogios ---------------------------------------------------------
CREATE TABLE public.game_reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vibe        smallint NOT NULL CHECK (vibe BETWEEN 1 AND 3),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, reviewer_id)
);
CREATE INDEX idx_game_reviews_reviewer ON public.game_reviews (reviewer_id);
ALTER TABLE public.game_reviews ENABLE ROW LEVEL SECURITY;
-- Quem avaliou vê a própria resposta; quem organizou e o gestor veem as do evento
CREATE POLICY "game_reviews_read" ON public.game_reviews FOR SELECT
  USING (
    reviewer_id = public._profile_id()
    OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.professional_id = public._profile_id())
    OR public.is_org_member(public.session_community(session_id), ARRAY['owner', 'admin'])
  );

CREATE TABLE public.game_kudos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  giver_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag         text NOT NULL CHECK (tag IN ('craque', 'fair_play', 'pontual', 'bom_de_grupo', 'animou')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (giver_id <> receiver_id),
  UNIQUE (session_id, giver_id, receiver_id, tag)
);
CREATE INDEX idx_game_kudos_receiver ON public.game_kudos (receiver_id);
CREATE INDEX idx_game_kudos_giver ON public.game_kudos (giver_id);
-- Sem política: ninguém lê direto (nem quem recebeu vê quem deu). Só pelas funções.
ALTER TABLE public.game_kudos ENABLE ROW LEVEL SECURITY;

-- Atividades que a pessoa jogou ou organizou, terminadas nos últimos 3 dias e
-- ainda sem avaliação dela, com quem pode receber elogio
CREATE OR REPLACE FUNCTION public.pending_game_reviews()
RETURNS TABLE (
  session_id uuid, title text, date date, start_time time, kind text,
  organization_id uuid, organization_name text, category_slug text, players jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH me AS (SELECT public._profile_id() AS id),
  cand AS (
    SELECT s.*
    FROM public.sessions s, me
    WHERE s.product <> 'pro'
      AND s.status <> 'cancelled'
      AND public.session_end_local(s.date, s.start_time, s.duration_minutes) <= public.now_sp()
      AND public.session_end_local(s.date, s.start_time, s.duration_minutes) > public.now_sp() - interval '3 days'
      AND (public.played_session(s.id, me.id) OR s.professional_id = me.id)
      AND NOT EXISTS (SELECT 1 FROM public.game_reviews r WHERE r.session_id = s.id AND r.reviewer_id = me.id)
  )
  SELECT c.id, c.title, c.date, c.start_time, c.kind, c.organization_id, o.name, cat.slug,
         coalesce((
           SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', public.short_name(p.full_name), 'avatar_url', p.avatar_url)
                            ORDER BY p.full_name)
           FROM public.profiles p, me
           WHERE p.id <> me.id
             AND p.deleted_at IS NULL
             AND NOT p.sports_hidden
             AND (public.played_session(c.id, p.id) OR p.id = c.professional_id)
         ), '[]'::jsonb)
  FROM cand c
  LEFT JOIN public.organizations o ON o.id = c.organization_id
  LEFT JOIN public.categories cat ON cat.id = c.category_id
  ORDER BY c.date DESC, c.start_time DESC
$$;
REVOKE ALL ON FUNCTION public.pending_game_reviews() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pending_game_reviews() TO authenticated;

-- Responder "como foi" e dar elogios, numa chamada só
-- p_kudos: [{ "receiver": "<profile_id>", "tag": "craque" }, ...]
CREATE OR REPLACE FUNCTION public.submit_game_review(p_session uuid, p_vibe smallint, p_kudos jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_me      uuid := public._profile_id();
  v_session record;
  v_end     timestamp;
  v_item    jsonb;
  v_rec     uuid;
  v_tag     text;
  v_count   integer := 0;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_session FROM public.sessions WHERE id = p_session;
  IF v_session.id IS NULL OR v_session.product = 'pro' OR v_session.status = 'cancelled' THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;
  v_end := public.session_end_local(v_session.date, v_session.start_time, v_session.duration_minutes);
  IF v_end > public.now_sp() THEN
    RAISE EXCEPTION 'not_ended' USING ERRCODE = 'P0001';
  END IF;
  IF v_end < public.now_sp() - interval '7 days' THEN
    RAISE EXCEPTION 'review_closed' USING ERRCODE = 'P0001';
  END IF;
  IF NOT (public.played_session(p_session, v_me) OR v_session.professional_id = v_me) THEN
    RAISE EXCEPTION 'not_a_player' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.game_reviews WHERE session_id = p_session AND reviewer_id = v_me) THEN
    RAISE EXCEPTION 'already_reviewed' USING ERRCODE = 'P0001';
  END IF;
  IF p_vibe IS NULL OR p_vibe NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'invalid_vibe' USING ERRCODE = 'P0001';
  END IF;
  IF jsonb_array_length(coalesce(p_kudos, '[]'::jsonb)) > 20 THEN
    RAISE EXCEPTION 'too_many_kudos' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.game_reviews (session_id, reviewer_id, vibe) VALUES (p_session, v_me, p_vibe);

  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(p_kudos, '[]'::jsonb)) LOOP
    v_rec := (v_item->>'receiver')::uuid;
    v_tag := v_item->>'tag';
    IF v_rec IS NULL OR v_rec = v_me
       OR v_tag NOT IN ('craque', 'fair_play', 'pontual', 'bom_de_grupo', 'animou')
       OR NOT (public.played_session(p_session, v_rec) OR v_rec = v_session.professional_id)
       OR EXISTS (SELECT 1 FROM public.profiles WHERE id = v_rec AND (sports_hidden OR deleted_at IS NOT NULL)) THEN
      RAISE EXCEPTION 'invalid_kudos' USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO public.game_kudos (session_id, giver_id, receiver_id, tag)
    VALUES (p_session, v_me, v_rec, v_tag)
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('status', 'ok', 'kudos', v_count);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_game_review(uuid, smallint, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_game_review(uuid, smallint, jsonb) TO authenticated;

-- 4. Ranking do mês da comunidade ---------------------------------------------
CREATE OR REPLACE FUNCTION public.community_ranking(p_org uuid, p_month date DEFAULT NULL)
RETURNS TABLE (rank integer, profile_id uuid, short_name text, avatar_url text, points integer, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH bounds AS (
    SELECT date_trunc('month', coalesce(p_month, public.now_sp()::date))::date AS d0
  ),
  mem AS (
    SELECT m.profile_id
    FROM public.organization_members m
    JOIN public.profiles p ON p.id = m.profile_id
    WHERE m.organization_id = p_org AND m.status = 'active'
      AND p.deleted_at IS NULL AND NOT p.sports_hidden
  ),
  sess AS (
    SELECT s.id, s.professional_id
    FROM public.sessions s, bounds
    WHERE s.organization_id = p_org
      AND s.product <> 'pro'
      AND s.status <> 'cancelled'
      AND s.date >= bounds.d0 AND s.date < (bounds.d0 + interval '1 month')
      AND public.session_end_local(s.date, s.start_time, s.duration_minutes) <= public.now_sp()
  ),
  pres AS (
    SELECT b.student_id AS pid, b.session_id
    FROM public.bookings b JOIN sess s ON s.id = b.session_id
    WHERE b.dependent_id IS NULL
      AND b.status IN ('pending', 'confirmed', 'completed')
      AND coalesce(b.attendance_status, 'present') IN ('present', 'late')
  ),
  org AS (
    SELECT s.professional_id AS pid FROM sess s
    WHERE (SELECT count(*) FROM pres x WHERE x.session_id = s.id) >= 3
  ),
  kud AS (
    SELECT k.receiver_id AS pid, least(count(*), 3) AS n
    FROM public.game_kudos k JOIN sess s ON s.id = k.session_id
    GROUP BY k.receiver_id, k.session_id
  ),
  rev AS (
    SELECT r.reviewer_id AS pid FROM public.game_reviews r JOIN sess s ON s.id = r.session_id
  ),
  pts AS (
    SELECT mem.profile_id AS pid,
           (10 * (SELECT count(*) FROM pres WHERE pres.pid = mem.profile_id)
          + 15 * (SELECT count(*) FROM org WHERE org.pid = mem.profile_id)
          +  3 * coalesce((SELECT sum(n) FROM kud WHERE kud.pid = mem.profile_id), 0)
          +  2 * (SELECT count(*) FROM rev WHERE rev.pid = mem.profile_id))::integer AS points
    FROM mem
  )
  SELECT (rank() OVER (ORDER BY pts.points DESC))::integer,
         p.id, public.short_name(p.full_name), p.avatar_url, pts.points, p.id = public._profile_id()
  FROM pts JOIN public.profiles p ON p.id = pts.pid
  WHERE public.is_org_member(p_org)
    AND (pts.points > 0 OR p.id = public._profile_id())
  ORDER BY pts.points DESC, p.full_name
$$;
REVOKE ALL ON FUNCTION public.community_ranking(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_ranking(uuid, date) TO authenticated;

-- 5. Perfil esportista -----------------------------------------------------------
-- p_org NULL: só a própria pessoa, somando todas as comunidades.
-- Com p_org: quem pede e a pessoa são membros ativos dela; os números são só
-- dessa comunidade. Modo reservado: só a própria pessoa vê.
CREATE OR REPLACE FUNCTION public.player_profile(p_profile uuid, p_org uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_me       uuid := public._profile_id();
  v_self     boolean := (p_profile = public._profile_id());
  v_person   record;
  v_since    timestamptz;
  v_games    integer;
  v_on_time  integer;
  v_marked   integer;
  v_absent   integer;
  v_org_n    integer;
  v_sports   jsonb;
  v_venues   jsonb;
  v_kudos    jsonb;
  v_top_name text;
  v_top_n    integer;
  v_streak   integer;
  v_distinct integer;
  v_rank     integer;
  v_points   integer;
BEGIN
  IF v_me IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT id, full_name, avatar_url, sports_hidden, deleted_at INTO v_person FROM public.profiles WHERE id = p_profile;
  IF v_person.id IS NULL OR v_person.deleted_at IS NOT NULL THEN
    RETURN NULL;
  END IF;
  IF NOT v_self THEN
    IF p_org IS NULL OR v_person.sports_hidden OR NOT public.is_org_member(p_org) OR NOT EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = p_org AND m.profile_id = p_profile AND m.status = 'active'
    ) THEN
      RETURN NULL;
    END IF;
  END IF;

  SELECT count(*) INTO v_games FROM public.player_games(p_profile, p_org);
  SELECT count(*) FILTER (WHERE att = 'present') INTO v_on_time FROM public.player_games(p_profile, p_org);

  -- frequência: presenças marcadas sobre todas as marcações (ausente conta contra)
  SELECT count(*) FILTER (WHERE b.attendance_status IN ('present', 'late')),
         count(*) FILTER (WHERE b.attendance_status = 'absent')
  INTO v_marked, v_absent
  FROM public.bookings b JOIN public.sessions s ON s.id = b.session_id
  WHERE b.student_id = p_profile AND b.dependent_id IS NULL AND s.product <> 'pro'
    AND (p_org IS NULL OR s.organization_id = p_org);

  SELECT count(*) INTO v_org_n
  FROM public.sessions s
  WHERE s.professional_id = p_profile AND s.product <> 'pro' AND s.status <> 'cancelled'
    AND (p_org IS NULL OR s.organization_id = p_org)
    AND public.session_end_local(s.date, s.start_time, s.duration_minutes) <= public.now_sp();

  SELECT coalesce(jsonb_agg(x ORDER BY x.n DESC), '[]'::jsonb) INTO v_sports FROM (
    SELECT c.slug, c.name, count(*) AS n
    FROM public.player_games(p_profile, p_org) g JOIN public.categories c ON c.id = g.category_id
    GROUP BY c.slug, c.name ORDER BY count(*) DESC LIMIT 3
  ) x;

  SELECT coalesce(jsonb_agg(x ORDER BY x.n DESC), '[]'::jsonb) INTO v_venues FROM (
    SELECT g.venue_name AS name, count(*) AS n
    FROM public.player_games(p_profile, p_org) g
    GROUP BY g.venue_name ORDER BY count(*) DESC LIMIT 3
  ) x;

  SELECT coalesce(jsonb_object_agg(tag, n), '{}'::jsonb) INTO v_kudos FROM (
    SELECT k.tag, count(*) AS n
    FROM public.game_kudos k JOIN public.sessions s ON s.id = k.session_id
    WHERE k.receiver_id = p_profile AND (p_org IS NULL OR s.organization_id = p_org)
    GROUP BY k.tag
  ) x;

  -- conquistas
  SELECT g.venue_name, count(*) INTO v_top_name, v_top_n
  FROM public.player_games(p_profile, p_org) g
  GROUP BY g.venue_name ORDER BY count(*) DESC LIMIT 1;

  SELECT coalesce(max(n), 0) INTO v_streak FROM (
    SELECT count(*) AS n FROM (
      SELECT wk, wk - (row_number() OVER (ORDER BY wk) * 7)::integer AS grp
      FROM (SELECT DISTINCT date_trunc('week', g.d)::date AS wk FROM public.player_games(p_profile, p_org) g) w
    ) g GROUP BY grp
  ) s;

  SELECT count(DISTINCT g.category_id) INTO v_distinct FROM public.player_games(p_profile, p_org) g;

  SELECT m.created_at INTO v_since
  FROM public.organization_members m
  WHERE m.profile_id = p_profile AND m.status = 'active' AND (p_org IS NULL OR m.organization_id = p_org)
  ORDER BY m.created_at LIMIT 1;

  IF p_org IS NOT NULL AND NOT v_person.sports_hidden THEN
    SELECT r.rank, r.points INTO v_rank, v_points FROM public.community_ranking(p_org) r WHERE r.profile_id = p_profile;
  END IF;

  RETURN jsonb_build_object(
    'id', v_person.id,
    'name', CASE WHEN v_self THEN v_person.full_name ELSE public.short_name(v_person.full_name) END,
    'avatar_url', v_person.avatar_url,
    'hidden', v_person.sports_hidden,
    'member_since', v_since,
    'games', v_games,
    'organized', v_org_n,
    'attendance', CASE WHEN v_marked + v_absent > 0 THEN round(100.0 * v_marked / (v_marked + v_absent)) END,
    'sports', v_sports,
    'venues', v_venues,
    'kudos', v_kudos,
    'month_rank', v_rank,
    'month_points', v_points,
    'achievements', jsonb_build_array(
      jsonb_build_object('key', 'dono_da_quadra', 'current', least(coalesce(v_top_n, 0), 5), 'target', 5, 'detail', v_top_name),
      jsonb_build_object('key', 'assiduo', 'current', least(v_streak, 4), 'target', 4),
      jsonb_build_object('key', 'organizador', 'current', least(v_org_n, 5), 'target', 5),
      jsonb_build_object('key', 'pontual', 'current', least(v_on_time, 10), 'target', 10),
      jsonb_build_object('key', 'multiesportista', 'current', least(v_distinct, 3), 'target', 3)
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.player_profile(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.player_profile(uuid, uuid) TO authenticated;

-- 6. "Quem vai": quem está no modo reservado aparece como "Membro", sem foto e sem id
-- (corpo igual ao de 20261027000014, com o modo reservado e o short_name comum)
CREATE OR REPLACE FUNCTION public.activity_participants(p_sessions uuid[], p_limit integer DEFAULT NULL)
RETURNS TABLE (session_id uuid, people jsonb, people_count integer, dependents integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH allowed AS (
    SELECT s.id
    FROM public.sessions s
    WHERE s.id = ANY (p_sessions)
      AND s.product <> 'pro'
      AND public.is_org_member(s.organization_id)
  ),
  adults AS (
    SELECT b.session_id,
           CASE WHEN p.sports_hidden AND p.id <> public._profile_id() THEN NULL ELSE p.id END AS profile_id,
           CASE WHEN p.sports_hidden AND p.id <> public._profile_id() THEN 'Membro' ELSE public.short_name(p.full_name) END AS short_name,
           CASE WHEN p.sports_hidden AND p.id <> public._profile_id() THEN NULL ELSE p.avatar_url END AS avatar_url,
           row_number() OVER (PARTITION BY b.session_id ORDER BY b.created_at) AS n
    FROM public.bookings b
    JOIN allowed a ON a.id = b.session_id
    JOIN public.profiles p ON p.id = b.student_id
    WHERE b.dependent_id IS NULL
      AND b.status IN ('pending', 'confirmed', 'completed')
      AND p.deleted_at IS NULL
  ),
  kids AS (
    SELECT b.session_id, count(*)::int AS n
    FROM public.bookings b
    JOIN allowed a ON a.id = b.session_id
    WHERE b.dependent_id IS NOT NULL AND b.status IN ('pending', 'confirmed', 'completed')
    GROUP BY b.session_id
  )
  SELECT a.id,
         coalesce((
           SELECT jsonb_agg(jsonb_build_object('id', x.profile_id, 'name', x.short_name, 'avatar_url', x.avatar_url) ORDER BY x.n)
           FROM adults x
           WHERE x.session_id = a.id AND (p_limit IS NULL OR x.n <= p_limit)
         ), '[]'::jsonb),
         (SELECT count(*)::int FROM adults x WHERE x.session_id = a.id),
         coalesce((SELECT k.n FROM kids k WHERE k.session_id = a.id), 0)
  FROM allowed a
$$;

COMMIT;
