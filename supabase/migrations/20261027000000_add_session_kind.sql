-- Migration for Frente 4: Tipo de atividade e correção de vocabulário
-- Data: 2026-10-27 (garantidamente posterior a 26/10/2026)

-- 1. Nova coluna kind em sessions
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'class'
  CHECK (kind IN ('class', 'match', 'tournament', 'event', 'other'));

CREATE INDEX IF NOT EXISTS idx_sessions_kind_active ON sessions (kind) WHERE status = 'active';

-- 2. Categorias novas para jogos e etc
INSERT INTO categories (name, slug, emoji, icon, sort_order) VALUES
  ('Airsoft', 'airsoft', '🔫', 'target', 20),
  ('Paintball', 'paintball', '🎨', 'target', 21),
  ('Futsal', 'futsal', '⚽', 'activity', 22),
  ('Basquete', 'basquete', '🏀', 'activity', 23),
  ('Handebol', 'handebol', '🤾', 'activity', 24),
  ('Padel', 'padel', '🎾', 'activity', 25),
  ('Skate', 'skate', '🛹', 'activity', 26),
  ('Trilha e Caminhada', 'trilha-caminhada', '🥾', 'map', 27),
  ('Dança', 'danca', '💃', 'music', 28),
  ('Jogos de Tabuleiro e Cartas', 'jogos-tabuleiro', '🎲', 'dices', 29),
  ('E-sports', 'esports', '🎮', 'gamepad', 30),
  ('Outros', 'outros', '✨', 'sparkles', 999)
ON CONFLICT (slug) DO NOTHING;

-- 3. Atualizar mensagens das functions antigas (Substituindo "aula" por "atividade")
CREATE OR REPLACE FUNCTION public.book_session(p_session_id uuid, p_student_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_session sessions%ROWTYPE;
  v_booking_id uuid;
  v_existing_booking uuid;
BEGIN
  -- Select session with lock
  SELECT * INTO v_session
  FROM sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atividade não encontrada';
  END IF;

  -- Check if already booked
  SELECT id INTO v_existing_booking
  FROM bookings
  WHERE session_id = p_session_id AND student_id = p_student_id AND status = 'confirmed';

  IF v_existing_booking IS NOT NULL THEN
    RAISE EXCEPTION 'Você já reservou esta atividade';
  END IF;

  -- Check capacity
  IF v_session.current_participants >= v_session.max_participants THEN
    RAISE EXCEPTION 'Atividade lotada';
  END IF;

  -- Create booking
  INSERT INTO bookings (session_id, student_id, status)
  VALUES (p_session_id, p_student_id, 'confirmed')
  RETURNING id INTO v_booking_id;

  -- Update participants count
  UPDATE sessions
  SET current_participants = current_participants + 1,
      status = CASE 
        WHEN current_participants + 1 >= max_participants THEN 'full'::session_status
        ELSE status
      END
  WHERE id = p_session_id;

  RETURN v_booking_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_booking bookings%ROWTYPE;
  v_session sessions%ROWTYPE;
BEGIN
  -- Get booking and lock
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva não encontrada';
  END IF;

  -- Verify ownership (if called by student)
  IF auth.uid() = v_booking.student_id THEN
    -- Check 4-hour rule
    SELECT * INTO v_session FROM sessions WHERE id = v_booking.session_id;
    IF (v_session.date + v_session.start_time) < (now() + interval '4 hours') THEN
      RAISE EXCEPTION 'Cancelamento só é permitido até 4 horas antes da atividade';
    END IF;
  END IF;

  -- Verify ownership (if called by pro)
  IF auth.uid() != v_booking.student_id THEN
    SELECT * INTO v_session FROM sessions WHERE id = v_booking.session_id;
    IF v_session.professional_id != auth.uid() THEN
      RAISE EXCEPTION 'Sem permissão';
    END IF;
  END IF;

  -- Update booking status
  UPDATE bookings
  SET status = CASE 
    WHEN auth.uid() = v_booking.student_id THEN 'cancelled_by_student'::booking_status
    ELSE 'cancelled_by_professional'::booking_status
  END
  WHERE id = p_booking_id;

  -- Update session counts
  UPDATE sessions
  SET current_participants = GREATEST(0, current_participants - 1),
      status = CASE 
        WHEN status = 'full' THEN 'active'::session_status
        ELSE status
      END
  WHERE id = v_booking.session_id;
END;
$function$;
