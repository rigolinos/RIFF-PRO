-- ============================================================
-- Horário das atividades: comparar sempre no fuso de Brasília
-- ============================================================
-- sessions.date + start_time é a hora local (America/Sao_Paulo), mas várias
-- regras comparavam com now(), que no banco está em UTC. Efeito: a inscrição
-- fechava cerca de 3 horas antes do início, o prazo de 4 horas para cancelar
-- virava 7, e inscrições de atividades das próximas horas não eram canceladas
-- ao remover membro, dependente ou conta. Agora tudo compara com now_sp().
-- Corpos iguais às versões vigentes, só com essa troca.
-- ============================================================

BEGIN;

-- create_booking: versão de 20261027000011_clubes_dependents.sql, comparando com o horário de Brasília (1 troca(s))
CREATE OR REPLACE FUNCTION public.create_booking(
  p_session_id  uuid,
  p_source      text  DEFAULT NULL,
  p_attribution jsonb DEFAULT '{}'::jsonb
)
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
  v_source   text := CASE
    WHEN p_source IN ('organizer_link', 'activity_link', 'feed', 'explore', 'direct', 'other') THEN p_source
    WHEN p_source IS NULL THEN NULL
    ELSE 'other'
  END;
  v_attribution jsonb := public.sanitize_attribution(p_attribution);
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
  IF (v_session.date + v_session.start_time) < public.now_sp() THEN
    RETURN jsonb_build_object('success', false, 'code', 'session_started');
  END IF;

  IF v_session.current_participants >= v_session.max_participants THEN
    RETURN jsonb_build_object('success', false, 'code', 'session_full');
  END IF;

  IF v_session.professional_id = v_student THEN
    RETURN jsonb_build_object('success', false, 'code', 'self_booking');
  END IF;

  -- Riff Clubes: só membro ativo da comunidade reserva
  IF v_session.product <> 'pro' AND NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_session.organization_id AND m.profile_id = v_student AND m.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'code', 'not_member');
  END IF;

  -- Check for existing booking (handle re-booking after cancellation)
  SELECT * INTO v_existing
  FROM public.bookings
  WHERE session_id = p_session_id AND student_id = v_student AND dependent_id IS NULL;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.status IN ('pending', 'confirmed', 'completed') THEN
      RETURN jsonb_build_object('success', false, 'code', 'already_booked');
    END IF;

    -- Re-activate a cancelled booking (a origem passa a ser a desta nova reserva)
    UPDATE public.bookings
    SET status = 'pending',
        cancelled_at = NULL,
        cancellation_reason = NULL,
        payment_status = CASE WHEN v_session.price_per_slot = 0 THEN 'free' ELSE 'pending' END,
        amount_total = v_session.price_per_slot,
        professional_payout = v_session.price_per_slot,
        source = v_source,
        attribution = v_attribution,
        updated_at = now()
    WHERE id = v_existing.id
    RETURNING id INTO v_booking;
  ELSE
    INSERT INTO public.bookings (
      session_id, student_id, professional_id,
      amount_total, professional_payout,
      payment_status, status,
      product, source, attribution
    ) VALUES (
      p_session_id, v_student, v_session.professional_id,
      v_session.price_per_slot, v_session.price_per_slot,
      CASE WHEN v_session.price_per_slot = 0 THEN 'free' ELSE 'pending' END,
      'pending',
      v_session.product, v_source, v_attribution
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

-- guard_booking_update: versão de 20261027000004_organizations_venues_attendance.sql, comparando com o horário de Brasília (1 troca(s))
CREATE OR REPLACE FUNCTION public.guard_booking_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
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
    -- Cannot change payment_status, checked_in, attendance or "un-cancel"
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status OR
       NEW.checked_in     IS DISTINCT FROM OLD.checked_in OR
       NEW.attendance_status      IS DISTINCT FROM OLD.attendance_status OR
       NEW.attendance_recorded_at IS DISTINCT FROM OLD.attendance_recorded_at OR
       NEW.attendance_recorded_by IS DISTINCT FROM OLD.attendance_recorded_by
    THEN
      RAISE EXCEPTION 'student_forbidden_field' USING ERRCODE = '42501';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status NOT IN ('pending', 'confirmed') OR NEW.status != 'cancelled_by_student' THEN
        RAISE EXCEPTION 'invalid_status_transition' USING ERRCODE = '42501';
      END IF;

      -- 4-hour cancellation rule (server-side enforcement)
      IF (SELECT (s.date + s.start_time) FROM public.sessions s WHERE s.id = OLD.session_id) - interval '4 hours' < public.now_sp() THEN
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

-- manage_member: versão de 20261027000010_clubes_manager_tools.sql, comparando com o horário de Brasília (1 troca(s))
CREATE OR REPLACE FUNCTION public.manage_member(p_org uuid, p_profile uuid, p_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_me     uuid := public._profile_id();
  v_target record;
  v_role   text;
BEGIN
  IF NOT public.is_org_member(p_org, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_profile = v_me THEN
    RAISE EXCEPTION 'cannot_change_self' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_target FROM public.organization_members
  WHERE organization_id = p_org AND profile_id = p_profile AND status = 'active'
  FOR UPDATE;
  IF v_target.profile_id IS NULL THEN
    RAISE EXCEPTION 'not_a_member' USING ERRCODE = 'P0001';
  END IF;
  IF v_target.role = 'owner' THEN
    RAISE EXCEPTION 'cannot_change_owner' USING ERRCODE = 'P0001';
  END IF;

  IF p_action = 'remove' THEN
    UPDATE public.organization_members SET status = 'removed'
    WHERE organization_id = p_org AND profile_id = p_profile;
    -- inscrições futuras nas atividades desta comunidade são canceladas
    UPDATE public.bookings b
    SET status = 'cancelled_by_pro', cancelled_at = now(), cancellation_reason = 'removido da comunidade'
    FROM public.sessions s
    WHERE b.session_id = s.id AND s.organization_id = p_org
      AND b.student_id = p_profile AND b.status IN ('pending', 'confirmed')
      AND (s.date + s.start_time) > public.now_sp();
    RETURN jsonb_build_object('status', 'removed');
  END IF;

  v_role := CASE p_action
    WHEN 'make_member' THEN 'member'
    WHEN 'make_instructor' THEN 'instructor'
    WHEN 'make_admin' THEN 'admin'
  END;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'invalid_action' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.organization_members SET role = v_role
  WHERE organization_id = p_org AND profile_id = p_profile;
  RETURN jsonb_build_object('status', 'active', 'role', v_role);
END;
$$;

-- remove_dependent: versão de 20261027000011_clubes_dependents.sql, comparando com o horário de Brasília (1 troca(s))
CREATE OR REPLACE FUNCTION public.remove_dependent(p_dependent uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.dependents
    WHERE id = p_dependent AND guardian_id = public._profile_id() AND removed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.bookings b
  SET status = 'cancelled_by_student', cancelled_at = now(), cancellation_reason = 'dependente removido'
  FROM public.sessions s
  WHERE b.session_id = s.id AND b.dependent_id = p_dependent
    AND b.status IN ('pending', 'confirmed')
    AND (s.date + s.start_time) > public.now_sp();

  UPDATE public.dependents
  SET full_name = NULL, birth_date = NULL, removed_at = now()
  WHERE id = p_dependent;
END;
$$;

-- delete_user_account: versão de 20261027000013_delete_account_clubes.sql, comparando com o horário de Brasília (2 troca(s))
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
    AND session_id IN (SELECT id FROM public.sessions WHERE (date + start_time) > public.now_sp());

  -- Atividades futuras como organizador: canceladas, com as reservas delas
  UPDATE public.sessions SET status = 'cancelled'
  WHERE professional_id = v_profile_id AND status IN ('active', 'full')
    AND (date + start_time) > public.now_sp();

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

COMMIT;
