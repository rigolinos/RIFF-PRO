-- ============================================================
-- Exclusão de conta: anonimizar em vez de apagar
-- ============================================================
-- Substitui a delete_user_account de 20260929000000, que:
--   * gravava em colunas removidas por 20260929000001 (phone, email, whatsapp_number,
--     pix_key, pix_key_type) e por isso falhava sempre;
--   * terminava apagando auth.users, o que pelo ON DELETE CASCADE de profiles.user_id
--     apagaria o perfil, as atividades e as reservas (registros de pagamento).
--
-- Regra nova (LGPD art. 16, I: guarda para cumprimento de obrigação legal):
--   * reservas e pagamentos ficam inteiros, ligados a um perfil anonimizado;
--   * dados pessoais são apagados ou anulados;
--   * o login (auth.users) é apagado e profiles.user_id vira NULL.
--
-- Também corrige: visitante sem login (anon) recebia "permission denied for function
-- _profile_id" ao ler sessions, porque as políticas de leitura chamam _profile_id().
-- ============================================================

BEGIN;

-- 1. profiles sobrevive à exclusão do login --------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.profiles
  ALTER COLUMN user_id DROP NOT NULL;

-- Troca o FK de profiles.user_id (ON DELETE CASCADE) por ON DELETE SET NULL,
-- seja qual for o nome do constraint no banco.
DO $$
DECLARE
  v_name text;
BEGIN
  FOR v_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.profiles'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'auth.users'::regclass
      AND a.attname = 'user_id'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', v_name);
  END LOOP;
END;
$$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. deleted_at é campo de sistema: o usuário não altera ----------
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
     NEW.total_students_served IS DISTINCT FROM OLD.total_students_served OR
     NEW.deleted_at            IS DISTINCT FROM OLD.deleted_at
  THEN
    RAISE EXCEPTION 'forbidden_profile_field' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_profile_update() FROM PUBLIC, anon, authenticated;

-- 3. delete_user_account: anonimiza ------------------------------
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

  -- Reservas futuras como participante: canceladas
  UPDATE public.bookings
  SET status = 'cancelled_by_student', cancelled_at = now(), cancellation_reason = 'account_deleted'
  WHERE student_id = v_profile_id AND status IN ('pending', 'confirmed')
    AND session_id IN (SELECT id FROM public.sessions WHERE (date + start_time) > now());

  -- Atividades futuras como organizador: canceladas, com as reservas delas
  UPDATE public.sessions SET status = 'cancelled'
  WHERE professional_id = v_profile_id AND status IN ('active', 'full')
    AND (date + start_time) > now();

  UPDATE public.bookings
  SET status = 'cancelled_by_pro', cancelled_at = now(), cancellation_reason = 'pro_account_deleted'
  WHERE professional_id = v_profile_id AND status IN ('pending', 'confirmed')
    AND session_id IN (SELECT id FROM public.sessions WHERE professional_id = v_profile_id AND status = 'cancelled');

  -- Dados pessoais e privados: apagados
  DELETE FROM public.profile_private WHERE profile_id = v_profile_id;
  DELETE FROM public.booking_private_notes
  WHERE professional_id = v_profile_id
     OR booking_id IN (SELECT id FROM public.bookings WHERE student_id = v_profile_id);
  UPDATE public.session_reports SET private_notes = NULL
  WHERE session_id IN (SELECT id FROM public.sessions WHERE professional_id = v_profile_id);
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  DELETE FROM public.favorites WHERE student_id = v_profile_id OR professional_id = v_profile_id;

  -- Avaliações escritas pela pessoa: a nota fica (média do organizador), o texto sai
  UPDATE public.reviews SET comment = NULL WHERE reviewer_id = v_profile_id;

  -- Perfil: anonimizado e marcado como excluído (reservas e pagamentos continuam ligados a ele)
  UPDATE public.profiles
  SET full_name         = 'Usuário removido',
      avatar_url        = NULL,
      bio               = NULL,
      city              = NULL,
      state             = NULL,
      credential_type   = NULL,
      credential_number = NULL,
      specialties       = NULL,
      experience_years  = NULL,
      public_slug       = NULL,
      instagram_handle  = NULL,
      deleted_at        = now()
  WHERE id = v_profile_id;

  -- Login: apagado. profiles.user_id vira NULL (ON DELETE SET NULL).
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- 4. Visitante sem login pode avaliar as políticas que usam _profile_id() ----
-- Para anon, auth.uid() é NULL e a função retorna NULL: não expõe nada.
GRANT EXECUTE ON FUNCTION public._profile_id() TO anon;

COMMIT;
