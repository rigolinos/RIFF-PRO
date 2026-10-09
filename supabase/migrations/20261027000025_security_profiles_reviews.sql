-- ============================================================
-- Segurança, prioridade alta: perfis e avaliações
-- ============================================================
-- Auditoria de 09/10/2026 (visitante sem login): qualquer pessoa com a chave
-- pública do app conseguia listar TODOS os perfis (inclusive de quem só
-- participa) e todas as avaliações com quem avaliou e qual reserva. Cruzando
-- os dois, dava para saber onde e quando alguém treinou.
--
-- Agora:
-- * Perfil de organizador (role = 'professional', não excluído) é a vitrine:
--   qualquer um vê, mas o visitante sem login só lê as colunas da vitrine
--   (sem user_id, datas, exclusão nem modo reservado).
-- * Perfil de participante só é visto por: a própria pessoa; quem organiza
--   uma atividade que ela reservou (e vice-versa); quem é da mesma
--   comunidade do Clubes; o gestor que recebeu o pedido dela para entrar.
-- * Avaliações: leitura direta só por quem avaliou e por quem foi avaliado.
--   A vitrine pública usa public_reviews(), que devolve nota, comentário,
--   destaques e só o primeiro nome com a inicial e a foto de quem avaliou
--   (sem foto e como "Participante" no modo reservado).
-- ============================================================

BEGIN;

-- 1. Quem pode ver o perfil de outra pessoa ---------------------------------------
CREATE OR REPLACE FUNCTION public.can_see_profile(p_profile uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH me AS (SELECT public._profile_id() AS id)
  SELECT (SELECT id FROM me) IS NOT NULL AND (
    p_profile = (SELECT id FROM me)
    -- organizador vê quem reservou com ele, e quem reservou vê o organizador
    OR EXISTS (SELECT 1 FROM public.bookings b, me
               WHERE (b.professional_id = me.id AND b.student_id = p_profile)
                  OR (b.student_id = me.id AND b.professional_id = p_profile))
    -- mesma comunidade do Clubes (eu ativo nela)
    OR EXISTS (SELECT 1
               FROM public.organization_members m1
               JOIN public.organization_members m2 ON m2.organization_id = m1.organization_id
               JOIN public.organizations o ON o.id = m1.organization_id AND o.kind IN ('condo', 'club'), me
               WHERE m1.profile_id = me.id AND m1.status = 'active' AND m2.profile_id = p_profile)
    -- gestor vê quem pediu para entrar na comunidade dele
    OR EXISTS (SELECT 1 FROM public.community_join_requests j
               WHERE j.profile_id = p_profile
                 AND public.is_org_member(j.organization_id, ARRAY['owner', 'admin']))
  )
$$;
-- o visitante precisa poder executar (a política é avaliada para ele), mas sem login a resposta é sempre "não"
REVOKE ALL ON FUNCTION public.can_see_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_see_profile(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "public_profiles_read" ON public.profiles;
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT
  USING (
    (role = 'professional' AND deleted_at IS NULL)
    OR user_id = (SELECT auth.uid())
    OR ((SELECT auth.uid()) IS NOT NULL AND public.can_see_profile(id))
  );

-- O visitante sem login só lê as colunas da vitrine
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, full_name, avatar_url, bio, city, state, role, professional_type, credential_type,
              credential_number, credential_verified, specialties, experience_years, public_slug,
              instagram_handle, rating_avg, total_reviews, total_sessions_given, total_students_served)
  ON public.profiles TO anon;

-- 2. Avaliações -----------------------------------------------------------------------
DROP POLICY IF EXISTS "public_reviews_read" ON public.reviews;
CREATE POLICY "reviews_read_own" ON public.reviews FOR SELECT
  USING (reviewer_id = (SELECT public._profile_id()) OR professional_id = (SELECT public._profile_id()));

-- Vitrine pública: sem quem avaliou nem qual reserva
CREATE OR REPLACE FUNCTION public.public_reviews(p_professional uuid, p_limit integer DEFAULT 20)
RETURNS TABLE (id uuid, rating integer, comment text, tags text[], created_at timestamptz,
               reviewer_name text, reviewer_avatar text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT r.id, r.rating, r.comment, r.tags, r.created_at,
         CASE WHEN p.sports_hidden OR p.deleted_at IS NOT NULL THEN 'Participante' ELSE public.short_name(p.full_name) END,
         CASE WHEN p.sports_hidden OR p.deleted_at IS NOT NULL THEN NULL ELSE p.avatar_url END
  FROM public.reviews r
  JOIN public.profiles pro ON pro.id = r.professional_id AND pro.role = 'professional' AND pro.deleted_at IS NULL
  LEFT JOIN public.profiles p ON p.id = r.reviewer_id
  WHERE r.professional_id = p_professional
  ORDER BY r.created_at DESC
  LIMIT least(greatest(coalesce(p_limit, 20), 1), 50)
$$;
REVOKE ALL ON FUNCTION public.public_reviews(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_reviews(uuid, integer) TO anon, authenticated;

COMMIT;
