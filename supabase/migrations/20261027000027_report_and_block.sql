-- ============================================================
-- Denunciar e bloquear (exigência da Google Play para apps com conteúdo de usuário)
-- ============================================================
-- O app tem conteúdo escrito por usuários: perfil (foto, apresentação), atividades
-- e avaliações. Faltava um jeito de denunciar esse conteúdo e de bloquear uma pessoa.
--
-- * content_reports: denúncia de perfil, atividade ou avaliação. Só quem denunciou
--   lê a própria denúncia; quem foi denunciado não sabe quem denunciou.
--   Gravação só por report_content (10 por dia por pessoa).
-- * profile_blocks: bloqueio entre duas contas. Só quem bloqueou lê; a pessoa
--   bloqueada não é avisada. No Riff Pro, bloqueio (de qualquer lado) impede
--   reserva nova entre os dois. As listas do app escondem quem a pessoa bloqueou.
--   No Riff Clubes o bloqueio não mexe nas inscrições (a agenda é da comunidade).
-- * Moderação pela equipe Riff, pelo terminal: admin_list_reports e
--   admin_resolve_report ('dismiss' ou 'remove').
-- ============================================================

BEGIN;

-- 1. Denúncias ---------------------------------------------------------------------------
CREATE TABLE public.content_reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_kind         text NOT NULL CHECK (target_kind IN ('profile', 'session', 'review')),
  target_id           uuid NOT NULL,
  -- quem escreveu o conteúdo denunciado
  reported_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  product             text NOT NULL DEFAULT 'pro' CHECK (product IN ('pro', 'clubes', 'sports')),
  reason              text NOT NULL CHECK (reason IN ('offensive', 'harassment', 'fraud', 'spam', 'safety', 'minor', 'other')),
  details             text CHECK (char_length(details) <= 500),
  status              text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'removed')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  resolved_at         timestamptz,
  resolution_note     text
);
-- uma denúncia aberta por pessoa para cada conteúdo
CREATE UNIQUE INDEX content_reports_one_open ON public.content_reports (reporter_id, target_kind, target_id) WHERE status = 'open';
CREATE INDEX content_reports_status ON public.content_reports (status, created_at);
CREATE INDEX content_reports_reported ON public.content_reports (reported_profile_id);
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
-- quem denunciou acompanha a própria denúncia; gravação só pela função
CREATE POLICY "content_reports_own_read" ON public.content_reports FOR SELECT
  USING (reporter_id = (SELECT public._profile_id()));

CREATE OR REPLACE FUNCTION public.report_content(p_kind text, p_target uuid, p_reason text, p_details text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_me      uuid := public._profile_id();
  v_author  uuid;
  v_product text := 'pro';
  v_id      uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR p_reason NOT IN ('offensive', 'harassment', 'fraud', 'spam', 'safety', 'minor', 'other') THEN
    RAISE EXCEPTION 'invalid_reason' USING ERRCODE = 'P0001';
  END IF;

  -- só dá para denunciar o que a pessoa consegue ver
  IF p_kind = 'profile' THEN
    SELECT p.id INTO v_author FROM public.profiles p
    WHERE p.id = p_target AND p.deleted_at IS NULL
      AND (p.role = 'professional' OR public.can_see_profile(p.id));
  ELSIF p_kind = 'session' THEN
    SELECT s.professional_id, s.product INTO v_author, v_product FROM public.sessions s
    WHERE s.id = p_target
      AND (s.product = 'pro' OR EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.organization_id = s.organization_id AND m.profile_id = v_me AND m.status = 'active'));
  ELSIF p_kind = 'review' THEN
    SELECT r.reviewer_id INTO v_author FROM public.reviews r WHERE r.id = p_target;
  ELSE
    RAISE EXCEPTION 'invalid_kind' USING ERRCODE = 'P0001';
  END IF;

  IF v_author IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_author = v_me THEN
    RAISE EXCEPTION 'own_content' USING ERRCODE = 'P0001';
  END IF;

  -- já denunciou este conteúdo e a denúncia segue aberta: devolve a mesma
  SELECT id INTO v_id FROM public.content_reports
  WHERE reporter_id = v_me AND target_kind = p_kind AND target_id = p_target AND status = 'open';
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  IF (SELECT count(*) FROM public.content_reports WHERE reporter_id = v_me AND created_at > now() - interval '24 hours') >= 10 THEN
    RAISE EXCEPTION 'too_many' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.content_reports (reporter_id, target_kind, target_id, reported_profile_id, product, reason, details)
  VALUES (v_me, p_kind, p_target, v_author, v_product, p_reason, nullif(btrim(left(coalesce(p_details, ''), 500)), ''))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.report_content(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_content(text, uuid, text, text) TO authenticated;

-- 2. Bloqueios ---------------------------------------------------------------------------
CREATE TABLE public.profile_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX profile_blocks_blocked ON public.profile_blocks (blocked_id);
ALTER TABLE public.profile_blocks ENABLE ROW LEVEL SECURITY;
-- só quem bloqueou lê: a pessoa bloqueada não fica sabendo
CREATE POLICY "profile_blocks_own_read" ON public.profile_blocks FOR SELECT
  USING (blocker_id = (SELECT public._profile_id()));

CREATE OR REPLACE FUNCTION public.block_profile(p_profile uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_me uuid := public._profile_id();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF p_profile = v_me THEN
    RAISE EXCEPTION 'own_profile' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_profile
                 AND (p.role = 'professional' OR public.can_see_profile(p.id))) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM public.profile_blocks WHERE blocker_id = v_me) >= 200 THEN
    RAISE EXCEPTION 'too_many' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.profile_blocks (blocker_id, blocked_id) VALUES (v_me, p_profile)
  ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.block_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.block_profile(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.unblock_profile(p_profile uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  DELETE FROM public.profile_blocks WHERE blocker_id = public._profile_id() AND blocked_id = p_profile;
$$;
REVOKE ALL ON FUNCTION public.unblock_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unblock_profile(uuid) TO authenticated;

-- Quem eu bloqueei (para a lista em Perfil e para esconder das listas do app)
CREATE OR REPLACE FUNCTION public.my_blocks()
RETURNS TABLE (profile_id uuid, name text, avatar_url text, blocked_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p.id,
         CASE WHEN p.deleted_at IS NOT NULL THEN 'Usuário removido'
              WHEN p.role = 'professional' THEN p.full_name
              ELSE public.short_name(p.full_name) END,
         CASE WHEN p.deleted_at IS NULL THEN p.avatar_url END,
         b.created_at
  FROM public.profile_blocks b
  JOIN public.profiles p ON p.id = b.blocked_id
  WHERE b.blocker_id = public._profile_id()
  ORDER BY b.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.my_blocks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_blocks() TO authenticated;

-- Riff Pro: com bloqueio de qualquer um dos lados, não entra reserva nova entre os dois
-- (vale também para reativar uma reserva cancelada, que o create_booking faz por UPDATE).
CREATE OR REPLACE FUNCTION public.booking_block_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF coalesce(NEW.product, 'pro') = 'pro' AND EXISTS (
    SELECT 1 FROM public.profile_blocks b
    WHERE (b.blocker_id = NEW.professional_id AND b.blocked_id = NEW.student_id)
       OR (b.blocker_id = NEW.student_id AND b.blocked_id = NEW.professional_id)
  ) THEN
    RAISE EXCEPTION 'blocked' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.booking_block_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER booking_block_guard_insert BEFORE INSERT ON public.bookings
  FOR EACH ROW WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.booking_block_guard();
CREATE TRIGGER booking_block_guard_rebook BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW WHEN (NEW.status = 'pending' AND OLD.status IS DISTINCT FROM 'pending')
  EXECUTE FUNCTION public.booking_block_guard();

-- Conta excluída: os bloqueios dela (feitos e recebidos) saem
CREATE OR REPLACE FUNCTION public.profile_deleted_clear_blocks()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.profile_blocks WHERE blocker_id = NEW.id OR blocked_id = NEW.id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.profile_deleted_clear_blocks() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER profile_deleted_clear_blocks AFTER UPDATE OF deleted_at ON public.profiles
  FOR EACH ROW WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION public.profile_deleted_clear_blocks();

-- 3. Moderação (equipe Riff, só pelo terminal) -------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_reports(p_status text DEFAULT 'open')
RETURNS TABLE (id uuid, created_at timestamptz, product text, target_kind text, target_id uuid, reason text, details text,
               reporter text, reported text, reported_profile_id uuid, reports_on_author integer, content text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT r.id, r.created_at, r.product, r.target_kind, r.target_id, r.reason, r.details,
         rep.full_name, aut.full_name, r.reported_profile_id,
         (SELECT count(*)::integer FROM public.content_reports x WHERE x.reported_profile_id = r.reported_profile_id),
         CASE r.target_kind
           WHEN 'profile' THEN (SELECT p.bio FROM public.profiles p WHERE p.id = r.target_id)
           WHEN 'session' THEN (SELECT concat_ws(' | ', s.title, s.description) FROM public.sessions s WHERE s.id = r.target_id)
           WHEN 'review'  THEN (SELECT v.comment FROM public.reviews v WHERE v.id = r.target_id)
         END,
         r.status
  FROM public.content_reports r
  LEFT JOIN public.profiles rep ON rep.id = r.reporter_id
  LEFT JOIN public.profiles aut ON aut.id = r.reported_profile_id
  WHERE p_status IS NULL OR r.status = p_status
  ORDER BY r.created_at
$$;
REVOKE ALL ON FUNCTION public.admin_list_reports(text) FROM PUBLIC, anon, authenticated;

-- 'dismiss': a denúncia não procede. 'remove': tira o conteúdo do ar e encerra todas as
-- denúncias abertas sobre ele. Perfil: sai a foto e a apresentação. Avaliação: sai o texto
-- e os destaques (a nota fica). Atividade: é cancelada, com as reservas dela.
CREATE OR REPLACE FUNCTION public.admin_resolve_report(p_report uuid, p_action text, p_note text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_r public.content_reports%ROWTYPE;
BEGIN
  SELECT * INTO v_r FROM public.content_reports WHERE id = p_report;
  IF v_r.id IS NULL THEN
    RAISE EXCEPTION 'denúncia não encontrada';
  END IF;
  IF v_r.status <> 'open' THEN
    RAISE EXCEPTION 'denúncia já resolvida (%)', v_r.status;
  END IF;

  IF p_action = 'dismiss' THEN
    UPDATE public.content_reports SET status = 'dismissed', resolved_at = now(), resolution_note = p_note WHERE id = p_report;
    RETURN 'denúncia arquivada';
  ELSIF p_action <> 'remove' THEN
    RAISE EXCEPTION 'ação inválida (use dismiss ou remove)';
  END IF;

  IF v_r.target_kind = 'profile' THEN
    UPDATE public.profiles SET bio = NULL, avatar_url = NULL WHERE id = v_r.target_id;
  ELSIF v_r.target_kind = 'review' THEN
    UPDATE public.reviews SET comment = NULL, tags = NULL WHERE id = v_r.target_id;
  ELSE
    UPDATE public.sessions SET status = 'cancelled' WHERE id = v_r.target_id AND status IN ('active', 'full');
    UPDATE public.bookings
    SET status = 'cancelled_by_pro', cancelled_at = now(), cancellation_reason = 'removed_by_moderation'
    WHERE session_id = v_r.target_id AND status IN ('pending', 'confirmed');
  END IF;

  UPDATE public.content_reports SET status = 'removed', resolved_at = now(), resolution_note = p_note
  WHERE target_kind = v_r.target_kind AND target_id = v_r.target_id AND status = 'open';
  RETURN 'conteúdo removido';
END;
$$;
REVOKE ALL ON FUNCTION public.admin_resolve_report(uuid, text, text) FROM PUBLIC, anon, authenticated;

COMMIT;
