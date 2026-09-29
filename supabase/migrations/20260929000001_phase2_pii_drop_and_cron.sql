-- ============================================================
-- PHASE 2: PII DROP & AUTO-CLOSE SESSIONS
-- ============================================================
BEGIN;

-- ============================================================
-- 1. DROP SENSITIVE COLUMNS FROM PUBLIC PROFILES
-- ============================================================
-- All PII data is now securely isolated in `profile_private`.
-- We leave `credential_type` and `credential_number` because 
-- they are considered public professional registry data (like CREF).

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS whatsapp_number,
  DROP COLUMN IF EXISTS pix_key,
  DROP COLUMN IF EXISTS pix_key_type;

-- ============================================================
-- 2. PG_CRON: AUTO-CLOSE SESSIONS AFTER 48H
-- ============================================================
-- Requires pg_cron extension. Supabase supports this via SQL.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the background worker function
CREATE OR REPLACE FUNCTION public.job_auto_close_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session record;
BEGIN
  -- Find sessions that are active/full, ended more than 48 hours ago
  FOR v_session IN
    SELECT id
    FROM public.sessions
    WHERE status IN ('active', 'full')
      AND (date + start_time + (duration_minutes || ' minutes')::interval) < (now() - interval '48 hours')
  LOOP
    -- Auto-close them using a system flag
    -- We'll mark the bookings as no_show by default since the pro didn't close them
    
    UPDATE public.bookings
    SET status = 'no_show'
    WHERE session_id = v_session.id AND status IN ('pending', 'confirmed');
    
    UPDATE public.sessions
    SET status = 'completed'
    WHERE id = v_session.id;

    INSERT INTO public.session_reports (session_id, happened, auto_closed, private_notes)
    VALUES (v_session.id, true, true, 'Auto-encerrada pelo sistema após 48h')
    ON CONFLICT (session_id) DO NOTHING;

  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.job_auto_close_expired_sessions() FROM PUBLIC, anon, authenticated;

-- Schedule it to run every 15 minutes
-- Unschedule first if it exists to avoid duplicates
SELECT cron.unschedule('auto_close_sessions')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto_close_sessions');

SELECT cron.schedule(
  'auto_close_sessions',
  '*/15 * * * *',
  'SELECT public.job_auto_close_expired_sessions();'
);

COMMIT;
