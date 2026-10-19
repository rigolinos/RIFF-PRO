-- ============================================================
-- Organizador que também joga (teste no celular, 18/10/2026)
-- ============================================================
-- Num racha, quem organiza costuma jogar. Antes, a vaga dele não contava ("1 de 10
-- confirmados") e ele não aparecia em "Quem vai". Agora o organizador marca "vou jogar
-- também" e ganha uma reserva gratuita na própria atividade: assim a contagem de vagas,
-- o "Quem vai", a chamada e o "jogou" do perfil esportista funcionam como para todo mundo.
--
-- * set_organizer_plays(atividade, true/false): só quem organiza, antes do início.
--   Entrar ocupa uma vaga (como uma reserva); sair devolve (gatilho on_booking_cancelled).
-- * A reserva do organizador não conta no painel (participantes, reservas) nem permite que
--   ele avalie a si mesmo.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.set_organizer_plays(p_session uuid, p_plays boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_me uuid := public._profile_id();
  v_s  record;
  v_b  record;
BEGIN
  IF v_me IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_s FROM public.sessions WHERE id = p_session FOR UPDATE;
  IF v_s.id IS NULL OR v_s.professional_id <> v_me THEN
    RETURN jsonb_build_object('success', false, 'code', 'forbidden');
  END IF;
  IF v_s.status NOT IN ('active', 'full') OR (v_s.date + v_s.start_time) <= public.now_sp() THEN
    RETURN jsonb_build_object('success', false, 'code', 'session_unavailable');
  END IF;

  SELECT * INTO v_b FROM public.bookings
  WHERE session_id = p_session AND student_id = v_me AND dependent_id IS NULL;

  IF p_plays THEN
    IF v_b.id IS NOT NULL AND v_b.status IN ('pending', 'confirmed') THEN
      RETURN jsonb_build_object('success', true, 'code', 'playing');
    END IF;
    IF v_s.current_participants >= v_s.max_participants THEN
      RETURN jsonb_build_object('success', false, 'code', 'session_full');
    END IF;
    IF v_b.id IS NOT NULL THEN
      UPDATE public.bookings
      SET status = 'confirmed', payment_status = 'free', cancelled_at = NULL, cancellation_reason = NULL, updated_at = now()
      WHERE id = v_b.id;
    ELSE
      INSERT INTO public.bookings (session_id, student_id, professional_id, amount_total, professional_payout, payment_status, status, product, source)
      VALUES (p_session, v_me, v_me, 0, 0, 'free', 'confirmed', v_s.product, 'other');
    END IF;
    UPDATE public.sessions
    SET current_participants = current_participants + 1,
        status = CASE WHEN current_participants + 1 >= max_participants THEN 'full' ELSE status END
    WHERE id = p_session;
    RETURN jsonb_build_object('success', true, 'code', 'playing');
  END IF;

  IF v_b.id IS NULL OR v_b.status NOT IN ('pending', 'confirmed') THEN
    RETURN jsonb_build_object('success', true, 'code', 'not_playing');
  END IF;
  -- devolve a vaga pelo gatilho on_booking_cancelled
  UPDATE public.bookings
  SET status = 'cancelled_by_student', cancelled_at = now(), cancellation_reason = 'organizer_not_playing'
  WHERE id = v_b.id;
  RETURN jsonb_build_object('success', true, 'code', 'not_playing');
END;
$$;
REVOKE ALL ON FUNCTION public.set_organizer_plays(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_organizer_plays(uuid, boolean) TO authenticated;

-- Ninguém avalia a si mesmo (a reserva do organizador que joga não abre avaliação)
DROP POLICY IF EXISTS "no_self_review" ON public.reviews;
CREATE POLICY "no_self_review" ON public.reviews AS RESTRICTIVE FOR INSERT
  WITH CHECK (reviewer_id <> professional_id);

-- Painel: a reserva do próprio organizador não conta como participante nem como reserva
-- (corpo igual ao de 20261027000016 + student_id <> organizador)
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
    'total_bookings',  (SELECT count(*) FROM public.bookings WHERE professional_id = v_profile_id AND student_id <> v_profile_id AND product = 'pro' AND status IN ('confirmed','pending')),
    'total_completed', (SELECT count(*) FROM public.bookings WHERE professional_id = v_profile_id AND student_id <> v_profile_id AND product = 'pro' AND status = 'completed'),
    'total_revenue',   (SELECT COALESCE(sum(amount_total), 0) FROM public.bookings WHERE professional_id = v_profile_id AND product = 'pro' AND payment_status = 'paid'),
    'avg_rating',      (SELECT rating_avg FROM public.profiles WHERE id = v_profile_id),
    'unique_students', (SELECT count(DISTINCT student_id) FROM public.bookings WHERE professional_id = v_profile_id AND student_id <> v_profile_id AND product = 'pro' AND status IN ('confirmed','completed'))
  ) INTO v_result;

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_professional_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_professional_dashboard() TO authenticated;

COMMIT;
