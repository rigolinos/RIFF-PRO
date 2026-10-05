-- ============================================================
-- Riff Clubes: "quem vai" nos eventos da comunidade
-- ============================================================
-- Decisão do dono do produto (05/10/2026): membros da mesma comunidade veem
-- quem confirmou presença nos eventos dela.
-- * Só foto e nome curto ("Felipe N."), só para membros ativos da comunidade
--   do evento; quem é de fora ou de outra comunidade não recebe nada.
-- * Menores (dependentes) nunca aparecem pelo nome: entram só na contagem.
-- * A RLS de bookings continua fechada; o acesso é só por esta função.
-- * Política de Privacidade do Clubes atualizada (nova versão, novo aceite).
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.activity_participants(p_sessions uuid[], p_limit integer DEFAULT NULL)
RETURNS TABLE (session_id uuid, people jsonb, people_count integer, dependents integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH allowed AS (
    SELECT s.id
    FROM public.sessions s
    WHERE s.id = ANY (p_sessions)
      AND s.product <> 'pro'
      AND public.is_org_member(s.organization_id)
  ),
  adults AS (
    SELECT b.session_id,
           p.id AS profile_id,
           -- primeiro nome + inicial do último sobrenome
           CASE
             WHEN p.full_name IS NULL OR btrim(p.full_name) = '' THEN 'Membro'
             WHEN array_length(regexp_split_to_array(btrim(p.full_name), '\s+'), 1) = 1 THEN btrim(p.full_name)
             ELSE split_part(btrim(p.full_name), ' ', 1) || ' ' ||
                  left((regexp_split_to_array(btrim(p.full_name), '\s+'))[array_length(regexp_split_to_array(btrim(p.full_name), '\s+'), 1)], 1) || '.'
           END AS short_name,
           p.avatar_url,
           row_number() OVER (PARTITION BY b.session_id ORDER BY b.created_at) AS n
    FROM public.bookings b
    JOIN allowed a ON a.id = b.session_id
    JOIN public.profiles p ON p.id = b.student_id
    WHERE b.dependent_id IS NULL
      AND b.status IN ('pending', 'confirmed', 'completed')
      AND p.deleted_at IS NULL
  ),
  kids AS (
    SELECT b.session_id, count(*)::int AS n
    FROM public.bookings b
    JOIN allowed a ON a.id = b.session_id
    WHERE b.dependent_id IS NOT NULL AND b.status IN ('pending', 'confirmed', 'completed')
    GROUP BY b.session_id
  )
  SELECT a.id,
         coalesce((
           SELECT jsonb_agg(jsonb_build_object('id', x.profile_id, 'name', x.short_name, 'avatar_url', x.avatar_url) ORDER BY x.n)
           FROM adults x
           WHERE x.session_id = a.id AND (p_limit IS NULL OR x.n <= p_limit)
         ), '[]'::jsonb),
         (SELECT count(*)::int FROM adults x WHERE x.session_id = a.id),
         coalesce((SELECT k.n FROM kids k WHERE k.session_id = a.id), 0)
  FROM allowed a
$$;
REVOKE ALL ON FUNCTION public.activity_participants(uuid[], integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activity_participants(uuid[], integer) TO authenticated;

COMMIT;
