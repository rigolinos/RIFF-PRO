-- ============================================================
-- PHASE 1: SECURITY HARDENING MIGRATION
-- Riff Pro — Full E2E Security Remediation
-- ============================================================
-- This migration MUST run in a single transaction.
-- It covers: RPCs, RLS, Triggers, profile_private, reviews, storage, close_session.
-- ============================================================

BEGIN;

-- ============================================================
-- 0. HELPER: Resolve profile_id from auth.uid()
-- ============================================================
CREATE OR REPLACE FUNCTION public._profile_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT id FROM public.profiles WHERE user_id = auth.uid() $$;

-- ============================================================
-- 1. NEW TABLE: profile_private (sensitive PII)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profile_private (
  profile_id   uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email        text,
  phone        text,
  whatsapp_number text,
  pix_key      text,
  pix_key_type text CHECK (pix_key_type IN ('cpf','email','phone','random', NULL)),
  credential_number text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

-- Only the owner can read/write their own private data
CREATE POLICY "own_private_read" ON public.profile_private
  FOR SELECT USING (profile_id = public._profile_id());
CREATE POLICY "own_private_write" ON public.profile_private
  FOR ALL USING (profile_id = public._profile_id())
  WITH CHECK (profile_id = public._profile_id());

CREATE TRIGGER profile_private_updated_at
  BEFORE UPDATE ON public.profile_private
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Expand: Copy existing PII from profiles into profile_private
INSERT INTO public.profile_private (profile_id, email, phone, whatsapp_number, pix_key, pix_key_type, credential_number)
SELECT id, email, phone, whatsapp_number, pix_key, pix_key_type, credential_number
FROM public.profiles
ON CONFLICT (profile_id) DO NOTHING;

-- ============================================================
-- 2. NEW TABLES: session_reports & booking_private_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.session_reports (
  session_id    uuid PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  happened      boolean NOT NULL DEFAULT true,
  private_notes text,
  auto_closed   boolean NOT NULL DEFAULT false,
  closed_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pro_own_session_reports" ON public.session_reports
  FOR ALL USING (
    session_id IN (SELECT id FROM public.sessions WHERE professional_id = public._profile_id())
  );

CREATE TABLE IF NOT EXISTS public.booking_private_notes (
  booking_id      uuid PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.profiles(id),
  note            text
);

ALTER TABLE public.booking_private_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pro_own_booking_notes" ON public.booking_private_notes
  FOR ALL USING (professional_id = public._profile_id())
  WITH CHECK (professional_id = public._profile_id());

-- ============================================================
-- 3. DROP OLD VULNERABLE RPCs (both signatures)
-- ============================================================
DROP FUNCTION IF EXISTS public.create_booking(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_professional_dashboard(uuid);
DROP FUNCTION IF EXISTS public.delete_user_account();

-- ============================================================
-- 4. NEW RPC: create_booking(p_session_id uuid)
--    Auth from auth.uid(), handles re-booking after cancel
-- ============================================================
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
  IF v_session IS NULL THEN
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

  IF v_existing IS NOT NULL THEN
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

-- ============================================================
-- 5. NEW RPC: get_professional_dashboard() — no params
-- ============================================================
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
    'total_sessions',  (SELECT count(*) FROM public.sessions WHERE professional_id = v_profile_id),
    'active_sessions', (SELECT count(*) FROM public.sessions WHERE professional_id = v_profile_id AND status IN ('active','full')),
    'total_bookings',  (SELECT count(*) FROM public.bookings WHERE professional_id = v_profile_id AND status IN ('confirmed','pending')),
    'total_completed', (SELECT count(*) FROM public.bookings WHERE professional_id = v_profile_id AND status = 'completed'),
    'total_revenue',   (SELECT COALESCE(sum(amount_total), 0) FROM public.bookings WHERE professional_id = v_profile_id AND payment_status = 'paid'),
    'avg_rating',      (SELECT rating_avg FROM public.profiles WHERE id = v_profile_id),
    'unique_students', (SELECT count(DISTINCT student_id) FROM public.bookings WHERE professional_id = v_profile_id AND status IN ('confirmed','completed'))
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_professional_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_professional_dashboard() TO authenticated;

-- ============================================================
-- 6. NEW RPC: get_booking_payment_info(p_booking_id uuid)
--    Only the student who owns the booking can see the pro's Pix/WhatsApp
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_booking_payment_info(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_student uuid;
  v_pro_id  uuid;
  v_result  jsonb;
BEGIN
  SELECT id INTO v_student FROM public.profiles WHERE user_id = auth.uid();
  IF v_student IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  -- Verify the booking belongs to this student and is in a valid state
  SELECT b.professional_id INTO v_pro_id
  FROM public.bookings b
  WHERE b.id = p_booking_id
    AND b.student_id = v_student
    AND b.status IN ('pending', 'confirmed');

  IF v_pro_id IS NULL THEN
    RAISE EXCEPTION 'forbidden_or_not_found' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'pix_key',         pp.pix_key,
    'pix_key_type',    pp.pix_key_type,
    'whatsapp_number', pp.whatsapp_number,
    'pro_name',        p.full_name
  ) INTO v_result
  FROM public.profile_private pp
  JOIN public.profiles p ON p.id = pp.profile_id
  WHERE pp.profile_id = v_pro_id;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_booking_payment_info(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_booking_payment_info(uuid) TO authenticated;

-- ============================================================
-- 7. NEW RPC: cancel_session(p_session_id, p_reason)
-- ============================================================
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
      cancellation_reason = COALESCE(p_reason, 'Aula cancelada pelo profissional')
  WHERE session_id = p_session_id
    AND status IN ('pending', 'confirmed');

  -- Cancel the session
  UPDATE public.sessions SET status = 'cancelled' WHERE id = p_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_session(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_session(uuid, text) TO authenticated;

-- ============================================================
-- 8. NEW RPC: close_session (Encerramento de aula)
-- ============================================================
CREATE OR REPLACE FUNCTION public.close_session(
  p_session_id uuid,
  p_attendance jsonb,
  p_happened   boolean DEFAULT true,
  p_notes      text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pro   uuid;
  v_start timestamptz;
  v_item  jsonb;
BEGIN
  SELECT s.professional_id,
         (s.date + s.start_time) AT TIME ZONE 'America/Sao_Paulo'
    INTO v_pro, v_start
    FROM public.sessions s
    JOIN public.profiles p ON p.id = s.professional_id
   WHERE s.id = p_session_id
     AND p.user_id = auth.uid()
     AND s.status IN ('active', 'full')
   FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'forbidden_or_invalid_state' USING ERRCODE = '42501';
  END IF;

  IF v_start > now() THEN
    RAISE EXCEPTION 'session_not_started' USING ERRCODE = 'P0001';
  END IF;

  -- If session didn't happen, treat as cancellation
  IF NOT p_happened THEN
    PERFORM public.cancel_session(p_session_id, 'session_did_not_happen');
    RETURN;
  END IF;

  -- Process attendance
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_attendance)
  LOOP
    UPDATE public.bookings b
    SET status = CASE
          WHEN (v_item->>'attended')::boolean THEN 'completed'
          ELSE 'no_show'
        END,
        checked_in = (v_item->>'attended')::boolean,
        checked_in_at = CASE WHEN (v_item->>'attended')::boolean THEN now() END,
        payment_status = CASE
          WHEN (v_item->>'paid')::boolean AND b.payment_status = 'pending' THEN 'paid'
          ELSE b.payment_status
        END,
        payment_confirmed_at = CASE
          WHEN (v_item->>'paid')::boolean AND b.payment_status = 'pending' THEN now()
          ELSE b.payment_confirmed_at
        END
    WHERE b.id = (v_item->>'booking_id')::uuid
      AND b.session_id = p_session_id
      AND b.status IN ('pending', 'confirmed');

    -- Upsert private note
    IF NULLIF(v_item->>'note', '') IS NOT NULL THEN
      INSERT INTO public.booking_private_notes (booking_id, professional_id, note)
      VALUES ((v_item->>'booking_id')::uuid, v_pro, v_item->>'note')
      ON CONFLICT (booking_id) DO UPDATE SET note = EXCLUDED.note;
    END IF;
  END LOOP;

  -- Anyone left active and not listed: no_show
  UPDATE public.bookings
  SET status = 'no_show'
  WHERE session_id = p_session_id AND status IN ('pending', 'confirmed');

  -- Mark session completed
  UPDATE public.sessions SET status = 'completed' WHERE id = p_session_id;

  -- Create session report
  INSERT INTO public.session_reports (session_id, happened, private_notes)
  VALUES (p_session_id, true, p_notes);

  -- Update pro metrics
  UPDATE public.profiles
  SET total_sessions_given  = COALESCE(total_sessions_given, 0) + 1,
      total_students_served = (
        SELECT count(DISTINCT student_id) FROM public.bookings
        WHERE professional_id = v_pro AND status = 'completed'
      )
  WHERE id = v_pro;
END;
$$;

REVOKE ALL ON FUNCTION public.close_session(uuid, jsonb, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_session(uuid, jsonb, boolean, text) TO authenticated;

-- ============================================================
-- 9. FIX RPC: calculate_professional_rating — search_path + permissions
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_professional_rating(pro_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE avg_r numeric;
BEGIN
  SELECT COALESCE(AVG(rating), 0) INTO avg_r FROM public.reviews WHERE professional_id = pro_id;
  UPDATE public.profiles
  SET rating_avg = avg_r,
      total_reviews = (SELECT count(*) FROM public.reviews WHERE professional_id = pro_id)
  WHERE id = pro_id;
  RETURN avg_r;
END;
$$;

-- Only callable by triggers/service_role, not by end-users
REVOKE ALL ON FUNCTION public.calculate_professional_rating(uuid) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 10. TRIGGER: Auto-recalculate rating on review changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.trigger_recalc_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.calculate_professional_rating(OLD.professional_id);
    RETURN OLD;
  ELSE
    PERFORM public.calculate_professional_rating(NEW.professional_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS on_review_change ON public.reviews;
CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_rating();

-- ============================================================
-- 11. FIX RPC: delete_user_account — anonimize, don't cascade-destroy
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id    uuid;
  v_profile_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = v_user_id;
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0001';
  END IF;

  -- Cancel any future active bookings as student
  UPDATE public.bookings
  SET status = 'cancelled_by_student', cancelled_at = now(), cancellation_reason = 'account_deleted'
  WHERE student_id = v_profile_id AND status IN ('pending', 'confirmed')
    AND session_id IN (SELECT id FROM public.sessions WHERE (date + start_time) > now());

  -- Cancel any future active sessions as pro
  UPDATE public.sessions SET status = 'cancelled'
  WHERE professional_id = v_profile_id AND status IN ('active', 'full')
    AND (date + start_time) > now();

  -- Cancel bookings on those sessions
  UPDATE public.bookings
  SET status = 'cancelled_by_pro', cancelled_at = now(), cancellation_reason = 'pro_account_deleted'
  WHERE professional_id = v_profile_id AND status IN ('pending', 'confirmed')
    AND session_id IN (SELECT id FROM public.sessions WHERE professional_id = v_profile_id AND status = 'cancelled');

  -- Delete private data
  DELETE FROM public.profile_private WHERE profile_id = v_profile_id;
  DELETE FROM public.booking_private_notes WHERE professional_id = v_profile_id;
  DELETE FROM public.notifications WHERE user_id = v_user_id;

  -- Anonimize profile (keep for historical booking/review integrity)
  UPDATE public.profiles
  SET full_name = 'Usuário Removido',
      avatar_url = NULL,
      bio = NULL,
      phone = NULL,
      email = NULL,
      whatsapp_number = NULL,
      pix_key = NULL,
      pix_key_type = NULL,
      credential_number = NULL,
      instagram_handle = NULL,
      public_slug = NULL,
      city = NULL,
      state = NULL
  WHERE id = v_profile_id;

  -- Delete auth user (this will terminate all sessions)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- ============================================================
-- 12. FIX: handle_new_user — write PII to profile_private
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  RETURNING id INTO v_profile_id;

  INSERT INTO public.profile_private (profile_id, email)
  VALUES (v_profile_id, NEW.email);

  RETURN NEW;
END;
$$;

-- ============================================================
-- 13. BOOKING RLS: Remove direct INSERT, fix UPDATE for both roles
-- ============================================================
-- Remove the vulnerable direct INSERT policy
DROP POLICY IF EXISTS "student_create_booking" ON public.bookings;

-- Remove old update-only-student policy
DROP POLICY IF EXISTS "student_cancel_booking" ON public.bookings;

-- New: Both student and pro can update their respective bookings
CREATE POLICY "booking_participant_update" ON public.bookings
  FOR UPDATE
  USING (
    student_id = public._profile_id()
    OR professional_id = public._profile_id()
  )
  WITH CHECK (
    student_id = public._profile_id()
    OR professional_id = public._profile_id()
  );

-- ============================================================
-- 14. TRIGGER: guard_booking_update (server-side field protection)
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_booking_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_caller text;
  v_profile_id uuid;
  v_is_student boolean;
  v_is_pro boolean;
BEGIN
  v_caller := current_user;

  -- Let SECURITY DEFINER functions, service_role, and superuser pass through
  IF v_caller NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- Immutable fields: never change these
  IF NEW.session_id     IS DISTINCT FROM OLD.session_id OR
     NEW.student_id     IS DISTINCT FROM OLD.student_id OR
     NEW.professional_id IS DISTINCT FROM OLD.professional_id OR
     NEW.amount_total   IS DISTINCT FROM OLD.amount_total OR
     NEW.platform_fee   IS DISTINCT FROM OLD.platform_fee OR
     NEW.professional_payout IS DISTINCT FROM OLD.professional_payout
  THEN
    RAISE EXCEPTION 'forbidden_field_change' USING ERRCODE = '42501';
  END IF;

  SELECT public._profile_id() INTO v_profile_id;
  v_is_student := (OLD.student_id = v_profile_id);
  v_is_pro     := (OLD.professional_id = v_profile_id);

  IF v_is_student AND NOT v_is_pro THEN
    -- Student: can only cancel (pending/confirmed -> cancelled_by_student)
    -- Cannot change payment_status, checked_in, or "un-cancel"
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status OR
       NEW.checked_in     IS DISTINCT FROM OLD.checked_in
    THEN
      RAISE EXCEPTION 'student_forbidden_field' USING ERRCODE = '42501';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status NOT IN ('pending', 'confirmed') OR NEW.status != 'cancelled_by_student' THEN
        RAISE EXCEPTION 'invalid_status_transition' USING ERRCODE = '42501';
      END IF;

      -- 4-hour cancellation rule (server-side enforcement)
      IF (SELECT (s.date + s.start_time) FROM public.sessions s WHERE s.id = OLD.session_id) - interval '4 hours' < now() THEN
        RAISE EXCEPTION 'late_cancellation' USING ERRCODE = 'P0001';
      END IF;
    END IF;

  ELSIF v_is_pro AND NOT v_is_student THEN
    -- Pro: can confirm payment, mark presence, complete, no_show, cancel
    -- Allowed transitions handled by the RLS + RPC layer
    NULL; -- Pro has broader permissions, validated by RPCs

  ELSE
    -- Neither student nor pro of this booking
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_booking_update ON public.bookings;
CREATE TRIGGER guard_booking_update
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_booking_update();

-- ============================================================
-- 15. TRIGGER: guard_profile_update (protect computed/sensitive fields)
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Let SECURITY DEFINER functions and service_role pass through
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- These fields are system-managed; user cannot change them
  IF NEW.id                    IS DISTINCT FROM OLD.id OR
     NEW.user_id               IS DISTINCT FROM OLD.user_id OR
     NEW.role                  IS DISTINCT FROM OLD.role OR
     NEW.credential_verified   IS DISTINCT FROM OLD.credential_verified OR
     NEW.rating_avg            IS DISTINCT FROM OLD.rating_avg OR
     NEW.total_reviews         IS DISTINCT FROM OLD.total_reviews OR
     NEW.total_sessions_given  IS DISTINCT FROM OLD.total_sessions_given OR
     NEW.total_students_served IS DISTINCT FROM OLD.total_students_served
  THEN
    RAISE EXCEPTION 'forbidden_profile_field' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_update ON public.profiles;
CREATE TRIGGER guard_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

-- ============================================================
-- 16. REVIEWS RLS: Tighten INSERT — only completed bookings
-- ============================================================
DROP POLICY IF EXISTS "student_create_review" ON public.reviews;

CREATE POLICY "student_create_review_verified" ON public.reviews
  FOR INSERT
  WITH CHECK (
    reviewer_id = public._profile_id()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = reviews.booking_id
        AND b.student_id = public._profile_id()
        AND b.status = 'completed'
        AND b.professional_id = reviews.professional_id
        AND b.session_id = reviews.session_id
    )
  );

-- ============================================================
-- 17. SESSIONS RLS: Allow pro to see completed/cancelled own sessions
-- ============================================================
DROP POLICY IF EXISTS "pro_own_sessions_read" ON public.sessions;
CREATE POLICY "pro_own_sessions_read" ON public.sessions
  FOR SELECT USING (
    professional_id = public._profile_id()
  );

-- Also let students see their booked sessions (even completed/cancelled)
DROP POLICY IF EXISTS "public_sessions_read" ON public.sessions;
CREATE POLICY "public_sessions_read" ON public.sessions
  FOR SELECT USING (
    status IN ('active', 'full')
    OR id IN (SELECT session_id FROM public.bookings WHERE student_id = public._profile_id())
  );

-- ============================================================
-- 18. STORAGE: Tighten avatar policies (bucket_id + folder)
-- ============================================================
DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;
CREATE POLICY "Users can update their own avatar." ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can delete their own avatar." ON storage.objects;
CREATE POLICY "Users can delete their own avatar." ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() = owner);

-- ============================================================
-- 19. REVOKE default EXECUTE on all SECURITY DEFINER functions from PUBLIC
-- ============================================================
REVOKE ALL ON FUNCTION public._profile_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._profile_id() TO authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- handle_new_user is called by trigger, not by users

REVOKE ALL ON FUNCTION public.handle_booking_cancellation() FROM PUBLIC, anon, authenticated;
-- handle_booking_cancellation is called by trigger

REVOKE ALL ON FUNCTION public.guard_booking_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_recalc_rating() FROM PUBLIC, anon, authenticated;

COMMIT;
