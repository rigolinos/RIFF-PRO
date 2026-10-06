import { supabase } from '@riff/core/supabase/client';

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Envia a foto de perfil para o bucket `avatars` e devolve o endereço público.
 * Mesmo padrão de nome do Riff Pro (`<profile_id>-<uuid>.<ext>`), que a exclusão
 * de conta usa para apagar as fotos da pessoa.
 */
export async function uploadAvatar(profileId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha uma imagem (JPG ou PNG).');
  if (file.size > MAX_BYTES) throw new Error('A foto pode ter até 5 MB.');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${profileId}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
