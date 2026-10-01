-- ============================================================
-- Reservar de novo depois de cancelar
-- ============================================================
-- create_booking testava "IF v_existing IS NOT NULL" num RECORD. Em PL/pgSQL isso
-- só é verdadeiro quando TODOS os campos são não nulos; uma reserva cancelada tem
-- campos nulos (checked_in_at, payment_confirmed_at...), então a função não via a
-- reserva antiga, tentava inserir outra e quebrava em
-- bookings_session_id_student_id_key. Agora a checagem é pelo id.
-- Corpo idêntico ao de 20260929000000, exceto as duas checagens.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.create_booking(p_session_id uuid)
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

    -- Re-activate a cancelled booking
    UPDATE public.bookings
    SET status = 'pending',
        cancelled_at = NULL,
        cancellation_reason = NULL,
        payment_status = CASE WHEN v_session.price_per_slot = 0 THEN 'free' ELSE 'pending' END,
        amount_total = v_session.price_per_slot,
        professional_payout = v_session.price_per_slot,
        updated_at = now()
    WHERE id = v_existing.id
    RETURNING id INTO v_booking;
  ELSE
    INSERT INTO public.bookings (
      session_id, student_id, professional_id,
      amount_total, professional_payout,
      payment_status, status
    ) VALUES (
      p_session_id, v_student, v_session.professional_id,
      v_session.price_per_slot, v_session.price_per_slot,
      CASE WHEN v_session.price_per_slot = 0 THEN 'free' ELSE 'pending' END,
      'pending'
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

REVOKE ALL ON FUNCTION public.create_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid) TO authenticated;

COMMIT;
