-- Migration to fix security flaws introduced in 20261027000000_add_session_kind.sql
-- Data: 2026-10-27 (posterior to previous)

-- 1. DROP the insecure hallucinated functions
DROP FUNCTION IF EXISTS public.book_session(uuid, uuid);
DROP FUNCTION IF EXISTS public.cancel_booking(uuid);

-- 2. Update messages for existing secure functions (only cancel_session has hardcoded texts)
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

-- 3. Update category sort_order to avoid collision with beach sports
UPDATE categories SET sort_order = 40 WHERE slug = 'airsoft';
UPDATE categories SET sort_order = 41 WHERE slug = 'paintball';
UPDATE categories SET sort_order = 42 WHERE slug = 'futsal';
UPDATE categories SET sort_order = 43 WHERE slug = 'basquete';
UPDATE categories SET sort_order = 44 WHERE slug = 'handebol';
UPDATE categories SET sort_order = 45 WHERE slug = 'padel';
UPDATE categories SET sort_order = 46 WHERE slug = 'skate';
UPDATE categories SET sort_order = 47 WHERE slug = 'trilha-caminhada';
UPDATE categories SET sort_order = 48 WHERE slug = 'danca';
UPDATE categories SET sort_order = 49 WHERE slug = 'jogos-tabuleiro';
UPDATE categories SET sort_order = 50 WHERE slug = 'esports';
UPDATE categories SET sort_order = 999 WHERE slug = 'outros';
