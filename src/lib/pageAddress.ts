import { supabase } from '@riff/core/supabase/client';
import { slugCandidates, slugFromName } from '@riff/core/lib/slug';

/**
 * Dá à página do organizador um endereço a partir do nome (riff-pro.vercel.app/@rodrigo-fonseca),
 * se ele ainda não tem. Tenta o nome e, se já tiver dono, nome-2, nome-3…
 * Não lança erro: sem endereço, a página continua funcionando pelo id.
 */
export async function claimPageAddress(profileId: string, name: string | null | undefined): Promise<string | null> {
  for (const slug of slugCandidates(slugFromName(name))) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ public_slug: slug })
      .eq('id', profileId)
      .is('public_slug', null)
      .select('public_slug');
    if (!error) return data?.[0]?.public_slug ?? null;
    if (error.code !== '23505') return null; // 23505 = endereço já tem dono: tenta o próximo
  }
  return null;
}
