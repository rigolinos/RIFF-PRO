-- ============================================================
-- Segurança, prioridade média: locais e fotos
-- ============================================================
-- Auditoria de 09/10/2026:
-- * Locais: qualquer pessoa lia todos os locais públicos do Pro, com endereço
--   e coordenada, inclusive de atividades antigas ou que nunca aconteceram.
--   Agora o local aparece para quem o cadastrou, para membros da comunidade
--   (locais do Clubes) e, para os demais, só enquanto tiver atividade aberta
--   do Pro marcada nele.
-- * Fotos (bucket avatars): a regra de leitura deixava qualquer pessoa listar
--   todos os arquivos (os nomes trazem o id de cada perfil). O bucket é
--   público, então as fotos continuam abrindo pelo link; listar fica só para
--   o dono dos arquivos (usado ao excluir a conta). Envio só de imagens, até 5 MB.
-- ============================================================

BEGIN;

-- 1. Locais ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "venues_read" ON public.venues;
CREATE POLICY "venues_read" ON public.venues FOR SELECT
  USING (
    (visibility = 'public' AND (
      created_by = (SELECT public._profile_id())
      OR EXISTS (SELECT 1 FROM public.sessions s
                 WHERE s.venue_id = venues.id AND s.product = 'pro'
                   AND s.status IN ('active', 'full') AND s.date >= (SELECT public.now_sp())::date)
    ))
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  );

-- 2. Fotos ---------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar." ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar." ON storage.objects;

-- o link público continua servindo a foto (bucket público); listar e baixar pela API só o dono
CREATE POLICY "avatars_owner_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND owner = (SELECT auth.uid()));
CREATE POLICY "avatars_owner_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND owner = (SELECT auth.uid()));
CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND owner = (SELECT auth.uid()))
  WITH CHECK (bucket_id = 'avatars' AND owner = (SELECT auth.uid()));
CREATE POLICY "avatars_owner_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND owner = (SELECT auth.uid()));

-- só imagens, até 5 MB (SVG fica de fora: pode carregar script)
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
WHERE id = 'avatars';

COMMIT;
