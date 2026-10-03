-- ============================================================
-- Riff Clubes (C4): ferramentas do gestor
-- ============================================================
-- * Gestor (owner/admin) lê as inscrições de todas as atividades da comunidade,
--   inclusive as conduzidas por instrutores.
-- * manage_member: gestor muda o papel (membro, instrutor, gestor) ou remove
--   um membro. Dono não é alterado; ninguém altera o próprio papel. Removido
--   tem as inscrições futuras daquela comunidade canceladas.
-- * close_community_session: encerra atividade do Clubes numa chamada, com
--   presença presente/atrasou/faltou/justificou (sem pagamento). Pode quem
--   conduz ou o gestor da comunidade. Atividades do Riff Pro continuam no
--   close_session.
-- ============================================================

BEGIN;

-- 1. Gestor vê as inscrições da comunidade ---------------------------------
-- Comunidade (condomínio/clube) da atividade; NULL para atividades do Riff Pro.
-- Lê sessions sem passar pela RLS: a política de leitura de sessions consulta
-- bookings, e consultar sessions daqui geraria recursão infinita. A regra vem
-- da atividade, não de bookings.product, que fica 'pro' (padrão) quando a
-- inscrição não passa pelo create_booking.
CREATE OR REPLACE FUNCTION public.session_community(p_session uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT organization_id FROM public.sessions WHERE id = p_session AND product <> 'pro' $$;
REVOKE ALL ON FUNCTION public.session_community(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_community(uuid) TO anon, authenticated;

CREATE POLICY "community_admin_bookings" ON public.bookings FOR SELECT
  USING (public.is_org_member(public.session_community(session_id), ARRAY['owner', 'admin']));

-- 2. Gerenciar membros -------------------------------------------------------
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
      AND (s.date + s.start_time) > now();
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
REVOKE ALL ON FUNCTION public.manage_member(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_member(uuid, uuid, text) TO authenticated;

-- 3. Encerrar atividade do Clubes ----------------------------------------
-- p_attendance: [{ "booking_id": "...", "status": "present" | "late" | "absent" | "excused" }]
CREATE OR REPLACE FUNCTION public.close_community_session(
  p_session_id uuid,
  p_attendance jsonb   DEFAULT '[]'::jsonb,
  p_happened   boolean DEFAULT true,
  p_notes      text    DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_session record;
  v_item    jsonb;
  v_status  text;
BEGIN
  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF v_session.id IS NULL OR v_session.product = 'pro' THEN
    RAISE EXCEPTION 'not_a_community_session' USING ERRCODE = 'P0001';
  END IF;
  IF v_session.professional_id IS DISTINCT FROM public._profile_id()
     AND NOT public.is_org_member(v_session.organization_id, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_session.status NOT IN ('active', 'full') THEN
    RAISE EXCEPTION 'already_closed' USING ERRCODE = 'P0001';
  END IF;

  IF NOT p_happened THEN
    UPDATE public.sessions SET status = 'cancelled' WHERE id = p_session_id;
    UPDATE public.bookings
    SET status = 'cancelled_by_pro', cancelled_at = now(), cancellation_reason = 'atividade não aconteceu'
    WHERE session_id = p_session_id AND status IN ('pending', 'confirmed');
    RETURN;
  END IF;

  IF (v_session.date + v_session.start_time) AT TIME ZONE 'America/Sao_Paulo' > now() THEN
    RAISE EXCEPTION 'session_not_started' USING ERRCODE = 'P0001';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(p_attendance, '[]'::jsonb)) LOOP
    v_status := v_item->>'status';
    IF v_status NOT IN ('present', 'late', 'absent', 'excused') THEN
      RAISE EXCEPTION 'invalid_attendance_status' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.bookings
    SET status = CASE WHEN v_status IN ('present', 'late') THEN 'completed' ELSE 'no_show' END,
        checked_in = v_status IN ('present', 'late'),
        checked_in_at = CASE WHEN v_status IN ('present', 'late') THEN now() END,
        attendance_status = v_status
    WHERE id = (v_item->>'booking_id')::uuid
      AND session_id = p_session_id
      AND status IN ('pending', 'confirmed');
  END LOOP;

  -- quem não foi listado: falta
  UPDATE public.bookings SET status = 'no_show', attendance_status = 'absent'
  WHERE session_id = p_session_id AND status IN ('pending', 'confirmed');

  UPDATE public.sessions SET status = 'completed' WHERE id = p_session_id;
  INSERT INTO public.session_reports (session_id, happened, private_notes)
  VALUES (p_session_id, true, p_notes)
  ON CONFLICT (session_id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.close_community_session(uuid, jsonb, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_community_session(uuid, jsonb, boolean, text) TO authenticated;

COMMIT;
