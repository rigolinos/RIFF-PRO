-- ============================================================
-- Riff Clubes (C5): dependentes menores e termos do Clubes
-- ============================================================
-- * Menor de idade não tem conta: é um dependente cadastrado pelo responsável,
--   que aceita o termo de consentimento (LGPD art. 14). Dados mínimos: nome,
--   data de nascimento e parentesco. Nada de dado de saúde.
-- * Só o responsável vê os próprios dependentes. Quem conduz a atividade e o
--   gestor da comunidade veem nome e data de nascimento apenas dos dependentes
--   inscritos nas atividades deles.
-- * Dependente só entra em atividade do Clubes marcada como "aceita menores",
--   numa comunidade da qual o responsável é membro ativo, e com a idade
--   mínima da atividade (se houver) no dia dela.
-- * A inscrição do dependente fica no nome do responsável (student_id), com
--   dependent_id preenchido. O responsável cancela pelo fluxo de sempre.
-- * Remover dependente apaga nome e data de nascimento (anonimiza) e cancela
--   as inscrições futuras; o histórico de presença fica sem dado pessoal.
-- * Novos documentos legais do Clubes: termos, privacidade e termo do
--   responsável.
-- ============================================================

BEGIN;

-- 1. Documentos legais do Clubes -------------------------------------------
ALTER TABLE public.legal_acceptances DROP CONSTRAINT legal_acceptances_document_check;
ALTER TABLE public.legal_acceptances ADD CONSTRAINT legal_acceptances_document_check
  CHECK (document IN ('terms', 'privacy', 'organizer_terms', 'clubes_terms', 'clubes_privacy', 'guardian_consent'));

-- 2. Dependentes -------------------------------------------------------------
CREATE TABLE public.dependents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name        text CHECK (full_name IS NULL OR length(btrim(full_name)) BETWEEN 2 AND 120),
  birth_date       date,
  relationship     text NOT NULL CHECK (relationship IN ('child', 'grandchild', 'ward', 'other')),
  consent_version  text NOT NULL,
  consented_at     timestamptz NOT NULL DEFAULT now(),
  removed_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  -- ativo tem nome e nascimento; removido fica sem dado pessoal
  CHECK ((removed_at IS NULL) = (full_name IS NOT NULL AND birth_date IS NOT NULL))
);
CREATE INDEX idx_dependents_guardian ON public.dependents (guardian_id);
ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;
-- Escrita só pelas funções abaixo (sem política de INSERT/UPDATE/DELETE).

ALTER TABLE public.bookings ADD COLUMN dependent_id uuid REFERENCES public.dependents(id);
-- Uma inscrição por pessoa e uma por dependente em cada atividade (antes:
-- UNIQUE (session_id, student_id), que impediria o responsável de se inscrever
-- junto com o filho).
ALTER TABLE public.bookings DROP CONSTRAINT bookings_session_id_student_id_key;
CREATE UNIQUE INDEX bookings_session_student_key ON public.bookings (session_id, student_id) WHERE dependent_id IS NULL;
CREATE UNIQUE INDEX bookings_session_dependent_key ON public.bookings (session_id, dependent_id) WHERE dependent_id IS NOT NULL;

-- Quem conduz ou gere a atividade em que o dependente está inscrito pode ver
-- o nome dele. SECURITY DEFINER para não cruzar a RLS de bookings/sessions.
CREATE OR REPLACE FUNCTION public.can_view_dependent(p_dependent uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.sessions s ON s.id = b.session_id
    WHERE b.dependent_id = p_dependent
      AND b.status IN ('pending', 'confirmed', 'completed', 'no_show')
      AND (s.professional_id = public._profile_id()
           OR public.is_org_member(s.organization_id, ARRAY['owner', 'admin']))
  )
$$;
REVOKE ALL ON FUNCTION public.can_view_dependent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_dependent(uuid) TO authenticated;

CREATE POLICY "dependents_guardian_read" ON public.dependents FOR SELECT
  USING (guardian_id = public._profile_id());
CREATE POLICY "dependents_staff_read" ON public.dependents FOR SELECT
  USING (removed_at IS NULL AND public.can_view_dependent(id));

-- 3. Atividade aceita menores? -----------------------------------------------
ALTER TABLE public.sessions
  ADD COLUMN minors_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN min_age smallint CHECK (min_age IS NULL OR min_age BETWEEN 0 AND 17);

-- 4. Cadastrar e remover dependente -----------------------------------------
-- O aceite do termo do responsável é gravado junto, na mesma transação.
CREATE OR REPLACE FUNCTION public.add_dependent(
  p_full_name       text,
  p_birth_date      date,
  p_relationship    text,
  p_consent_version text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_me  uuid := public._profile_id();
  v_id  uuid;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF coalesce(btrim(p_consent_version), '') = '' THEN
    RAISE EXCEPTION 'consent_required' USING ERRCODE = 'P0001';
  END IF;
  IF p_birth_date IS NULL OR p_birth_date > v_today THEN
    RAISE EXCEPTION 'invalid_birth_date' USING ERRCODE = 'P0001';
  END IF;
  IF p_birth_date <= (v_today - interval '18 years')::date THEN
    RAISE EXCEPTION 'not_a_minor' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM public.dependents WHERE guardian_id = v_me AND removed_at IS NULL) >= 10 THEN
    RAISE EXCEPTION 'too_many_dependents' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.legal_acceptances (profile_id, document, version)
  VALUES (v_me, 'guardian_consent', btrim(p_consent_version))
  ON CONFLICT (profile_id, document, version) DO NOTHING;

  INSERT INTO public.dependents (guardian_id, full_name, birth_date, relationship, consent_version)
  VALUES (v_me, btrim(p_full_name), p_birth_date, p_relationship, btrim(p_consent_version))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.add_dependent(text, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_dependent(text, date, text, text) TO authenticated;

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
    AND (s.date + s.start_time) > now();

  UPDATE public.dependents
  SET full_name = NULL, birth_date = NULL, removed_at = now()
  WHERE id = p_dependent;
END;
$$;
REVOKE ALL ON FUNCTION public.remove_dependent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_dependent(uuid) TO authenticated;

-- 5. Inscrever dependente ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_dependent_booking(p_session_id uuid, p_dependent_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_me        uuid := public._profile_id();
  v_dependent record;
  v_session   record;
  v_existing  record;
  v_booking   uuid;
  v_age       int;
BEGIN
  IF v_me IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_dependent FROM public.dependents
  WHERE id = p_dependent_id AND guardian_id = v_me AND removed_at IS NULL;
  IF v_dependent.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'dependent_not_found');
  END IF;

  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF v_session.id IS NULL OR v_session.product = 'pro' THEN
    RETURN jsonb_build_object('success', false, 'code', 'session_not_found');
  END IF;
  IF v_session.status NOT IN ('active', 'full') THEN
    RETURN jsonb_build_object('success', false, 'code', 'session_unavailable');
  END IF;
  IF (v_session.date + v_session.start_time) AT TIME ZONE 'America/Sao_Paulo' < now() THEN
    RETURN jsonb_build_object('success', false, 'code', 'session_started');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_session.organization_id AND m.profile_id = v_me AND m.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'code', 'not_member');
  END IF;
  IF NOT v_session.minors_allowed THEN
    RETURN jsonb_build_object('success', false, 'code', 'minors_not_allowed');
  END IF;

  v_age := date_part('year', age(v_session.date, v_dependent.birth_date))::int;
  IF v_age >= 18 THEN
    RETURN jsonb_build_object('success', false, 'code', 'dependent_adult');
  END IF;
  IF v_session.min_age IS NOT NULL AND v_age < v_session.min_age THEN
    RETURN jsonb_build_object('success', false, 'code', 'below_min_age');
  END IF;
  IF v_session.current_participants >= v_session.max_participants THEN
    RETURN jsonb_build_object('success', false, 'code', 'session_full');
  END IF;

  SELECT * INTO v_existing FROM public.bookings
  WHERE session_id = p_session_id AND dependent_id = p_dependent_id;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.status IN ('pending', 'confirmed', 'completed') THEN
      RETURN jsonb_build_object('success', false, 'code', 'already_booked');
    END IF;
    UPDATE public.bookings
    SET status = 'pending', cancelled_at = NULL, cancellation_reason = NULL, updated_at = now()
    WHERE id = v_existing.id
    RETURNING id INTO v_booking;
  ELSE
    INSERT INTO public.bookings (
      session_id, student_id, dependent_id, professional_id,
      amount_total, professional_payout, payment_status, status, product, source
    ) VALUES (
      p_session_id, v_me, p_dependent_id, v_session.professional_id,
      0, 0, 'free', 'pending', v_session.product, 'other'
    ) RETURNING id INTO v_booking;
  END IF;

  UPDATE public.sessions
  SET current_participants = current_participants + 1,
      status = CASE WHEN current_participants + 1 >= max_participants THEN 'full' ELSE status END
  WHERE id = p_session_id;

  RETURN jsonb_build_object('success', true, 'code', 'booked', 'booking_id', v_booking);
END;
$$;
REVOKE ALL ON FUNCTION public.create_dependent_booking(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_dependent_booking(uuid, uuid) TO authenticated;

-- 6. create_booking: a inscrição da própria pessoa ignora as dos dependentes
-- (corpo igual ao de 20261027000009 + "AND dependent_id IS NULL")
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
  IF (v_session.date + v_session.start_time) < now() THEN
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

REVOKE ALL ON FUNCTION public.create_booking(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, text, jsonb) TO authenticated;

-- 7. Remover membro também cancela as inscrições futuras dos dependentes dele
-- (já coberto: manage_member cancela por student_id, e o dependente é inscrito
-- no nome do responsável).

COMMIT;
