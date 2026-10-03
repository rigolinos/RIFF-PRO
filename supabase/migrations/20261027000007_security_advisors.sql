-- ============================================================
-- Correções apontadas pelo verificador do Supabase (db advisors) e
-- pela comparação banco x repositório (02/10/2026)
-- ============================================================
-- 1. Remove trigger e função que existiam só no banco (criados à mão, fora das
--    migrations): on_review_created / trigger_calculate_professional_rating.
--    Faziam o mesmo que on_review_change (recalcular a nota), rodavam com
--    privilégio elevado sem search_path fixo e ficavam expostos como RPC.
-- 2. search_path fixo nas funções que ainda não tinham (corpo já usa nomes
--    qualificados com public.).
-- 3. Políticas que chamavam auth.uid() / subconsulta por linha passam a avaliar
--    uma vez por consulta: (SELECT ...). Mesma regra, mais rápido.
-- 4. Índices nas chaves estrangeiras sem índice.
-- ============================================================

BEGIN;

-- 1. Trigger duplicado
DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
DROP FUNCTION IF EXISTS public.trigger_calculate_professional_rating();

-- 2. search_path fixo
ALTER FUNCTION public.update_updated_at() SET search_path = '';
ALTER FUNCTION public.handle_booking_cancellation() SET search_path = '';
ALTER FUNCTION public.guard_booking_update() SET search_path = '';
ALTER FUNCTION public.guard_profile_update() SET search_path = '';
ALTER FUNCTION public.sync_booking_attendance() SET search_path = '';
ALTER FUNCTION public.legal_acceptance_server_time() SET search_path = '';
REVOKE ALL ON FUNCTION public.handle_booking_cancellation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;

-- 3. Políticas avaliadas uma vez por consulta
DROP POLICY IF EXISTS "own_profile_update" ON public.profiles;
CREATE POLICY "own_profile_update" ON public.profiles FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "pro_sessions_write" ON public.sessions;
CREATE POLICY "pro_sessions_write" ON public.sessions FOR ALL
  USING (professional_id = (SELECT public._profile_id()));

DROP POLICY IF EXISTS "student_own_bookings" ON public.bookings;
CREATE POLICY "student_own_bookings" ON public.bookings FOR SELECT
  USING (student_id = (SELECT public._profile_id()));

DROP POLICY IF EXISTS "pro_session_bookings" ON public.bookings;
CREATE POLICY "pro_session_bookings" ON public.bookings FOR SELECT
  USING (professional_id = (SELECT public._profile_id()));

DROP POLICY IF EXISTS "own_notifications" ON public.notifications;
CREATE POLICY "own_notifications" ON public.notifications FOR ALL
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "own_favorites" ON public.favorites;
CREATE POLICY "own_favorites" ON public.favorites FOR ALL
  USING (student_id = (SELECT public._profile_id()));

-- 4. Índices em chaves estrangeiras
CREATE INDEX IF NOT EXISTS idx_activity_results_booking ON public.activity_results (booking_id);
CREATE INDEX IF NOT EXISTS idx_activity_results_recorded_by ON public.activity_results (recorded_by);
CREATE INDEX IF NOT EXISTS idx_booking_private_notes_professional ON public.booking_private_notes (professional_id);
CREATE INDEX IF NOT EXISTS idx_bookings_attendance_recorded_by ON public.bookings (attendance_recorded_by);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_favorites_professional ON public.favorites (professional_id);
CREATE INDEX IF NOT EXISTS idx_reviews_professional ON public.reviews (professional_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON public.reviews (reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_session ON public.reviews (session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_parent_session ON public.sessions (parent_session_id);
CREATE INDEX IF NOT EXISTS idx_venues_created_by ON public.venues (created_by);

COMMIT;
