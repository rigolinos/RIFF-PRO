import { supabase } from '@riff/core/supabase/client';

const MAX_BYTES = 5 * 1024 * 1024;
// mesmos tipos que o bucket aceita (migration 20261027000026); SVG fica de fora
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

/** Envia uma imagem para o bucket `avatars` (prefixo + uuid) e devolve o endereço público. */
export async function uploadImage(prefix: string, file: File): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('Escolha uma imagem JPG, PNG ou WEBP.');
  if (file.size > MAX_BYTES) throw new Error('A imagem pode ter até 5 MB.');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${prefix}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

/**
 * Foto de perfil. Mesmo padrão de nome do Riff Pro (`<profile_id>-<uuid>.<ext>`), que a exclusão
 * de conta usa para apagar as fotos da pessoa.
 */
export const uploadAvatar = (profileId: string, file: File) => uploadImage(profileId, file);
