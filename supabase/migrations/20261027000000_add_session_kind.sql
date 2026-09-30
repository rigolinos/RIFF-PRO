-- Migration for Frente 4: Tipo de atividade e correcao de vocabulario
-- Data: 2026-10-27 (garantidamente posterior a 26/10/2026)

-- 1. Nova coluna kind em sessions
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'class'
  CHECK (kind IN ('class', 'match', 'tournament', 'event', 'other'));

CREATE INDEX IF NOT EXISTS idx_sessions_kind_active ON sessions (kind) WHERE status = 'active';

-- 2. Categorias novas para jogos e etc
INSERT INTO categories (name, slug, emoji, icon, sort_order) VALUES
  ('Airsoft', 'airsoft', '🔫', 'target', 40),
  ('Paintball', 'paintball', '🎨', 'target', 41),
  ('Futsal', 'futsal', '⚽', 'activity', 42),
  ('Basquete', 'basquete', '🏀', 'activity', 43),
  ('Handebol', 'handebol', '🤾', 'activity', 44),
  ('Padel', 'padel', '🎾', 'activity', 45),
  ('Skate', 'skate', '🛹', 'activity', 46),
  ('Trilha e Caminhada', 'trilha-caminhada', '🥾', 'map', 47),
  ('Dança', 'danca', '💃', 'music', 48),
  ('Jogos de Tabuleiro e Cartas', 'jogos-tabuleiro', '🎲', 'dices', 49),
  ('E-sports', 'esports', '🎮', 'gamepad', 50),
  ('Outros', 'outros', '✨', 'sparkles', 999)
ON CONFLICT (slug) DO NOTHING;

-- 3. Atualizar mensagens da function cancel_session (Substituindo "Aula" por "Atividade")
CREATE OR REPLACE FUNCTION public.cancel_session(p_session_id uuid, p_reason text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $$
DECLARE
  v_pro uuid;
BEGIN
  SELECT s.professional_id INTO v_pro
  FROM public.sessions s
  JOIN public.profiles p ON p.id = s.professional_id
  WHERE s.id = p_session_id AND p.user_id = auth.uid()
    AND s.status IN ('active', 'full')
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'forbidden_or_invalid_state' USING ERRCODE = '42501';
  END IF;

  -- Cancel all active bookings
  UPDATE public.bookings
  SET status = 'cancelled_by_pro',
      cancelled_at = now(),
      cancellation_reason = COALESCE(p_reason, 'Atividade cancelada pelo organizador')
  WHERE session_id = p_session_id
    AND status IN ('pending', 'confirmed');

  -- Cancel the session
  UPDATE public.sessions SET status = 'cancelled' WHERE id = p_session_id;
END;
$$;

-- Ensure book_session and cancel_booking are dropped in case they were applied locally
DROP FUNCTION IF EXISTS public.book_session(uuid, uuid);
DROP FUNCTION IF EXISTS public.cancel_booking(uuid);

-- create_booking uses error codes since hardening, but in case core_schema.sql is the reference for legacy clients:
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
    RETURN jsonb_build_object('success', false, 'code', 'unauthenticated', 'message', 'Não autenticado');
  END IF;

  SELECT id INTO v_student FROM public.profiles WHERE user_id = v_user_id;
  IF v_student IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'profile_not_found', 'message', 'Perfil não encontrado');
  END IF;

  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'session_not_found', 'message', 'Atividade não encontrada');
  END IF;

  IF v_session.status NOT IN ('active', 'full') THEN
    RETURN jsonb_build_object('success', false, 'code', 'session_unavailable', 'message', 'Atividade não está disponível');
  END IF;

  IF (v_session.date + v_session.start_time) < now() THEN
    RETURN jsonb_build_object('success', false, 'code', 'session_started', 'message', 'Atividade já começou');
  END IF;

  IF v_session.current_participants >= v_session.max_participants THEN
    RETURN jsonb_build_object('success', false, 'code', 'session_full', 'message', 'Atividade lotada');
  END IF;

  IF v_session.professional_id = v_student THEN
    RETURN jsonb_build_object('success', false, 'code', 'self_booking', 'message', 'Você não pode reservar sua própria atividade');
  END IF;

  SELECT * INTO v_existing
  FROM public.bookings
  WHERE session_id = p_session_id AND student_id = v_student;

  IF v_existing IS NOT NULL THEN
    IF v_existing.status IN ('pending', 'confirmed', 'completed') THEN
      RETURN jsonb_build_object('success', false, 'code', 'already_booked', 'message', 'Você já reservou esta atividade');
    END IF;

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

  UPDATE public.sessions
  SET current_participants = current_participants + 1,
      status = CASE
        WHEN current_participants + 1 >= max_participants THEN 'full'::session_status
        ELSE status
      END
  WHERE id = p_session_id;

  RETURN jsonb_build_object('success', true, 'booking_id', v_booking);
END;
$$;
