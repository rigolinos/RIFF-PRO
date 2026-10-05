-- ============================================================
-- Excluir conta também limpa os dados do Riff Clubes (LGPD)
-- ============================================================
-- delete_user_account anonimizava o perfil, mas os dependentes menores da
-- pessoa ficavam com nome e data de nascimento. Agora são anonimizados como no
-- remove_dependent.
-- Corpo igual ao de 20261027000003 + o bloco do Riff Clubes.
-- ============================================================

BEGIN;

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

  -- Riff Clubes: dependentes menores anonimizados (as inscrições futuras deles,
  -- feitas no nome do responsável, já foram canceladas acima). A saída das
  -- comunidades já acontece pelo gatilho profile_deleted_leave_orgs.
  UPDATE public.dependents SET full_name = NULL, birth_date = NULL, removed_at = now()
  WHERE guardian_id = v_profile_id AND removed_at IS NULL;

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

COMMIT;
