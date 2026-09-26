-- Migration: LGPD Account Deletion & Indexes
-- Description: Adds secure RPC for self-service account deletion and required indexes.

-- 1. Create the RPC function to delete user account securely
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to delete from auth.users
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the ID of the authenticated user making the request
  v_user_id := auth.uid();
  
  -- Strict validation: Only the authenticated user can delete their own account
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '401 Unauthorized: Usuário não autenticado.';
  END IF;

  -- Ensure cascading behavior for public.profiles if foreign key doesn't have ON DELETE CASCADE
  -- We delete dependent data manually first to avoid foreign key constraint violations
  DELETE FROM public.reviews WHERE reviewer_id = v_user_id OR professional_id = v_user_id;
  DELETE FROM public.bookings WHERE student_id = v_user_id OR professional_id = v_user_id;
  DELETE FROM public.sessions WHERE professional_id = v_user_id;
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- Finally, delete the auth record. This revokes sessions and destroys the login capability.
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;
