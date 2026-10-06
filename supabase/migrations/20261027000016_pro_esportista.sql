-- ============================================================
-- Riff Pro (P5): quem vai, avaliação, perfil esportista pessoal
-- ============================================================
-- Decisões do dono do produto (06/10/2026):
-- * "Quem vai" no Pro: só quem reservou a atividade (e quem organiza) vê foto
--   e nome curto dos outros participantes; os demais veem só a contagem.
--   Modo reservado aparece como "Participante", sem foto e sem id.
-- * Perfil esportista pessoal no Pro: só a própria pessoa vê (sem ranking:
--   o Pro é aberto, e competição fica para comunidades fechadas).
-- * Avaliar o organizador: além da reserva encerrada pelo organizador, vale a
--   reserva confirmada (paga ou grátis) de uma atividade que já terminou e em
--   que a pessoa não foi marcada como ausente.
-- * Painel do organizador conta só o Riff Pro (antes somava o Clubes).
-- ============================================================

BEGIN;

-- 1. Painel do organizador: só atividades e reservas do Pro ---------------------
-- (corpo igual ao de 20260929000000 + product = 'pro')
CREATE OR REPLACE FUNCTION public.get_professional_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_id uuid;
  v_result     jsonb;
BEGIN
  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'total_sessions',  (SELECT count(*) FROM public.sessions WHERE professional_id = v_profile_id AND product = 'pro'),
    'active_sessions', (SELECT count(*) FROM public.sessions WHERE professional_id = v_profile_id AND product = 'pro' AND status IN ('active','full')),
    'total_bookings',  (SELECT count(*) FROM public.bookings WHERE professional_id = v_profile_id AND product = 'pro' AND status IN ('confirmed','pending')),
    'total_completed', (SELECT count(*) FROM public.bookings WHERE professional_id = v_profile_id AND product = 'pro' AND status = 'completed'),
    'total_revenue',   (SELECT COALESCE(sum(amount_total), 0) FROM public.bookings WHERE professional_id = v_profile_id AND product = 'pro' AND payment_status = 'paid'),
    'avg_rating',      (SELECT rating_avg FROM public.profiles WHERE id = v_profile_id),
    'unique_students', (SELECT count(DISTINCT student_id) FROM public.bookings WHERE professional_id = v_profile_id AND product = 'pro' AND status IN ('confirmed','completed'))
  ) INTO v_result;

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_professional_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_professional_dashboard() TO authenticated;

-- 2. "Quem vai" no Pro -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pro_session_participants(p_session uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_me      uuid := public._profile_id();
  v_session record;
  v_count   integer;
  v_inside  boolean;
  v_people  jsonb;
BEGIN
  SELECT id, professional_id, product INTO v_session FROM public.sessions WHERE id = p_session;
  IF v_session.id IS NULL OR v_session.product <> 'pro' THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.bookings b
  WHERE b.session_id = p_session AND b.dependent_id IS NULL AND b.status IN ('pending', 'confirmed', 'completed');

  v_inside := v_me IS NOT NULL AND (
    v_session.professional_id = v_me OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.session_id = p_session AND b.student_id = v_me AND b.dependent_id IS NULL
        AND b.status IN ('pending', 'confirmed', 'completed')
    )
  );

  IF v_inside THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'id',         CASE WHEN p.sports_hidden AND p.id <> v_me THEN NULL ELSE p.id END,
             'name',       CASE WHEN p.sports_hidden AND p.id <> v_me THEN 'Participante' ELSE public.short_name(p.full_name) END,
             'avatar_url', CASE WHEN p.sports_hidden AND p.id <> v_me THEN NULL ELSE p.avatar_url END
           ) ORDER BY b.created_at), '[]'::jsonb)
    INTO v_people
    FROM public.bookings b
    JOIN public.profiles p ON p.id = b.student_id
    WHERE b.session_id = p_session AND b.dependent_id IS NULL
      AND b.status IN ('pending', 'confirmed', 'completed')
      AND p.deleted_at IS NULL;
  END IF;

  RETURN jsonb_build_object('count', v_count, 'people', v_people);
END;
$$;
REVOKE ALL ON FUNCTION public.pro_session_participants(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pro_session_participants(uuid) TO anon, authenticated;

-- 3. Avaliar o organizador: também depois de uma atividade confirmada que terminou -----
DROP POLICY IF EXISTS "student_create_review_verified" ON public.reviews;
CREATE POLICY "student_create_review_verified" ON public.reviews
  FOR INSERT
  WITH CHECK (
    reviewer_id = public._profile_id()
    AND EXISTS (
      SELECT 1
      FROM public.bookings b
      JOIN public.sessions s ON s.id = b.session_id
      WHERE b.id = reviews.booking_id
        AND b.student_id = public._profile_id()
        AND b.professional_id = reviews.professional_id
        AND b.session_id = reviews.session_id
        AND (
          b.status = 'completed'
          OR (
            b.status = 'confirmed'
            AND b.payment_status IN ('paid', 'free')
            AND coalesce(b.attendance_status, 'present') IN ('present', 'late')
            AND s.status <> 'cancelled'
            AND public.session_end_local(s.date, s.start_time, s.duration_minutes) <= public.now_sp()
          )
        )
    )
  );

-- 4. Perfil esportista pessoal no Pro (só a própria pessoa) ------------------------------
-- Jogos do Pro da pessoa: reservas de atividades que terminaram, sem ausência (uso interno)
CREATE OR REPLACE FUNCTION public.pro_player_games(p_profile uuid)
RETURNS TABLE (session_id uuid, category_id uuid, venue_name text, d date, att text, organizer uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT s.id, s.category_id, coalesce(v.name, s.location_name), s.date, b.attendance_status, s.professional_id
  FROM public.bookings b
  JOIN public.sessions s ON s.id = b.session_id
  LEFT JOIN public.venues v ON v.id = s.venue_id
  WHERE b.student_id = p_profile AND b.dependent_id IS NULL
    AND s.product = 'pro' AND s.status <> 'cancelled'
    AND b.status IN ('pending', 'confirmed', 'completed')
    AND coalesce(b.attendance_status, 'present') IN ('present', 'late')
    AND public.session_end_local(s.date, s.start_time, s.duration_minutes) <= public.now_sp()
$$;
REVOKE ALL ON FUNCTION public.pro_player_games(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.my_pro_sports_profile()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_me       uuid := public._profile_id();
  v_games    integer;
  v_on_time  integer;
  v_marked   integer;
  v_absent   integer;
  v_sports   jsonb;
  v_venues   jsonb;
  v_orgs     jsonb;
  v_top_name text;
  v_top_n    integer;
  v_streak   integer;
  v_distinct integer;
  v_fiel_n   integer;
  v_fiel     text;
  v_reviews  integer;
BEGIN
  IF v_me IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT count(*), count(*) FILTER (WHERE att = 'present') INTO v_games, v_on_time FROM public.pro_player_games(v_me);

  SELECT count(*) FILTER (WHERE b.attendance_status IN ('present', 'late')),
         count(*) FILTER (WHERE b.attendance_status = 'absent')
  INTO v_marked, v_absent
  FROM public.bookings b JOIN public.sessions s ON s.id = b.session_id
  WHERE b.student_id = v_me AND b.dependent_id IS NULL AND s.product = 'pro';

  SELECT coalesce(jsonb_agg(x ORDER BY x.n DESC), '[]'::jsonb) INTO v_sports FROM (
    SELECT c.slug, c.name, count(*) AS n
    FROM public.pro_player_games(v_me) g JOIN public.categories c ON c.id = g.category_id
    GROUP BY c.slug, c.name ORDER BY count(*) DESC LIMIT 3
  ) x;

  SELECT coalesce(jsonb_agg(x ORDER BY x.n DESC), '[]'::jsonb) INTO v_venues FROM (
    SELECT g.venue_name AS name, count(*) AS n FROM public.pro_player_games(v_me) g
    GROUP BY g.venue_name ORDER BY count(*) DESC LIMIT 3
  ) x;

  SELECT coalesce(jsonb_agg(x ORDER BY x.n DESC), '[]'::jsonb) INTO v_orgs FROM (
    SELECT p.id, public.short_name(p.full_name) AS name, p.avatar_url, p.public_slug, count(*) AS n
    FROM public.pro_player_games(v_me) g JOIN public.profiles p ON p.id = g.organizer
    GROUP BY p.id, p.full_name, p.avatar_url, p.public_slug ORDER BY count(*) DESC LIMIT 3
  ) x;

  SELECT g.venue_name, count(*) INTO v_top_name, v_top_n
  FROM public.pro_player_games(v_me) g GROUP BY g.venue_name ORDER BY count(*) DESC LIMIT 1;

  SELECT coalesce(max(n), 0) INTO v_streak FROM (
    SELECT count(*) AS n FROM (
      SELECT wk, wk - (row_number() OVER (ORDER BY wk) * 7)::integer AS grp
      FROM (SELECT DISTINCT date_trunc('week', d)::date AS wk FROM public.pro_player_games(v_me)) w
    ) g GROUP BY grp
  ) s;

  SELECT count(DISTINCT category_id) INTO v_distinct FROM public.pro_player_games(v_me);

  SELECT public.short_name(p.full_name), count(*) INTO v_fiel, v_fiel_n
  FROM public.pro_player_games(v_me) g JOIN public.profiles p ON p.id = g.organizer
  GROUP BY p.full_name ORDER BY count(*) DESC LIMIT 1;

  SELECT count(*) INTO v_reviews FROM public.reviews WHERE reviewer_id = v_me;

  RETURN jsonb_build_object(
    'games', v_games,
    'attendance', CASE WHEN v_marked + v_absent > 0 THEN round(100.0 * v_marked / (v_marked + v_absent)) END,
    'sports', v_sports,
    'venues', v_venues,
    'organizers', v_orgs,
    'reviews_given', v_reviews,
    'achievements', jsonb_build_array(
      jsonb_build_object('key', 'dono_da_quadra', 'current', least(coalesce(v_top_n, 0), 5), 'target', 5, 'detail', v_top_name),
      jsonb_build_object('key', 'assiduo', 'current', least(v_streak, 4), 'target', 4),
      jsonb_build_object('key', 'fiel', 'current', least(coalesce(v_fiel_n, 0), 5), 'target', 5, 'detail', v_fiel),
      jsonb_build_object('key', 'pontual', 'current', least(v_on_time, 10), 'target', 10),
      jsonb_build_object('key', 'multiesportista', 'current', least(v_distinct, 3), 'target', 3)
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.my_pro_sports_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_pro_sports_profile() TO authenticated;

COMMIT;
