import { useQuery } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';

/** O que falta para a conta organizar no Riff Pro (lista vazia = pode publicar) */
export function useOrganizerMissing() {
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['organizer-missing', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_organizer_missing');
      if (error) throw error;
      return (data ?? []) as string[];
    },
    enabled: !!profile?.id,
  });
}

// Erros da porta de organizador (become_organizer e o trigger das atividades)
const MESSAGES: Record<string, string> = {
  organizer_terms_required: 'Aceite o Termo do Organizador para continuar.',
  full_name_required: 'Informe seu nome completo, com sobrenome.',
  tax_id_invalid: 'Confira o CPF ou CNPJ: os números não conferem.',
  tax_id_in_use: 'Este CPF ou CNPJ já está ligado a outra conta. Fale com a equipe Riff se precisar de ajuda.',
  birth_date_required: 'Informe sua data de nascimento.',
  underage: 'Para organizar atividades é preciso ter 18 anos ou mais.',
  whatsapp_required: 'Informe um celular com DDD.',
  city_required: 'Informe sua cidade.',
  bio_too_short: 'Escreva uma apresentação curta (pelo menos 10 letras).',
  pix_required: 'Informe o tipo e a chave Pix.',
  organizer_profile_incomplete: 'Complete seu cadastro de organizador para publicar.',
};

export function organizerErrorMessage(error: unknown, fallback: string) {
  const msg = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : '';
  const key = Object.keys(MESSAGES).find((k) => msg.includes(k));
  if (key) return MESSAGES[key];
  if (msg.includes('professional_type_check')) return 'Escolha a sua área de atuação.';
  return fallback;
}
