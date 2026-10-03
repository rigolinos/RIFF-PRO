-- ============================================================
-- De onde vem cada reserva + produto (Pro, Clubes, Sports)
-- ============================================================
-- "Registrar tudo": o critério de pronto do Pro inclui "mais de 60% das reservas
-- vindas pelo link do organizador", e esse dado não se recupera depois.
--
-- * bookings.source: canal da reserva (primeira entrada da visita).
--     organizer_link  chegou pelo link do organizador (/@slug, /pro/...)
--     activity_link   chegou pelo link de uma atividade (/session/...)
--     feed | explore  descobriu dentro do app
--     direct | other  entrou direto no app / outro caminho
--   NULL = reserva feita antes deste registro existir.
-- * bookings.attribution: utm_*, ref e domínio de origem (chaves controladas).
-- * product em sessions e bookings: o mesmo banco vai servir Riff Pro,
--   Riff Clubes e Riff Sports; as métricas saem por produto desde já.
-- ============================================================

BEGIN;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS product text NOT NULL DEFAULT 'pro' CHECK (product IN ('pro', 'clubes', 'sports'));

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS product text NOT NULL DEFAULT 'pro' CHECK (product IN ('pro', 'clubes', 'sports')),
  ADD COLUMN IF NOT EXISTS source text
    CHECK (source IN ('organizer_link', 'activity_link', 'feed', 'explore', 'direct', 'other')),
  ADD COLUMN IF NOT EXISTS attribution jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_bookings_source ON public.bookings (product, source);

-- Mantém só chaves conhecidas, como texto de até 200 caracteres.
CREATE OR REPLACE FUNCTION public.sanitize_attribution(p jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT coalesce(jsonb_object_agg(key, left(value, 200)), '{}'::jsonb)
  FROM jsonb_each_text(CASE WHEN jsonb_typeof(p) = 'object' THEN p ELSE '{}'::jsonb END)
  WHERE key IN ('utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
                'ref', 'referrer_host', 'landing_path')
    AND value IS NOT NULL AND value <> ''
$$;

REVOKE ALL ON FUNCTION public.sanitize_attribution(jsonb) FROM PUBLIC, anon;

-- create_booking ganha origem e atribuição (opcionais: clientes antigos continuam funcionando)
DROP FUNCTION IF EXISTS public.create_booking(uuid);
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

-- Números do organizador logado: reservas pagas, recompra e peso do link dele
CREATE OR REPLACE FUNCTION public.get_professional_insights()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pro uuid := public._profile_id();
BEGIN
  IF v_pro IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH b AS (
      SELECT * FROM public.bookings
      WHERE professional_id = v_pro AND status NOT LIKE 'cancelled%'
    ),
    per_student AS (
      SELECT student_id, count(*) AS n FROM b
      WHERE status IN ('confirmed', 'completed') OR payment_status = 'paid'
      GROUP BY student_id
    )
    SELECT jsonb_build_object(
      'paid_bookings_30d', (SELECT count(*) FROM b WHERE payment_status = 'paid' AND created_at >= now() - interval '30 days'),
      'bookings_30d',      (SELECT count(*) FROM b WHERE created_at >= now() - interval '30 days'),
      'tracked_bookings',  (SELECT count(*) FROM b WHERE source IS NOT NULL),
      'via_link',          (SELECT count(*) FROM b WHERE source IN ('organizer_link', 'activity_link')),
      'returning_participants', (SELECT count(*) FROM per_student WHERE n >= 2),
      'participants',      (SELECT count(*) FROM per_student)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_professional_insights() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_professional_insights() TO authenticated;

COMMIT;
