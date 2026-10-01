import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { LEGAL_VERSIONS, type LegalDocumentId } from '@/legal/documents';

// Documentos que cada pessoa precisa ter aceitado na versão vigente.
export function requiredDocuments(role: string | null | undefined): LegalDocumentId[] {
  return role === 'professional' ? ['terms', 'privacy', 'organizer_terms'] : ['terms', 'privacy'];
}

export function useLegalAcceptance() {
  const { profile, isLoading: isLoadingProfile } = useProfile();
  const queryClient = useQueryClient();

  const acceptancesQuery = useQuery({
    queryKey: ['legal-acceptances', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_acceptances')
        .select('document, version')
        .eq('profile_id', profile!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const required = requiredDocuments(profile?.role);
  const accepted = new Set((acceptancesQuery.data ?? []).map((a) => `${a.document}@${a.version}`));
  const missing = required.filter((doc) => !accepted.has(`${doc}@${LEGAL_VERSIONS[doc]}`));

  const accept = useMutation({
    mutationFn: async (documents: LegalDocumentId[]) => {
      if (!profile?.id) throw new Error('Perfil não encontrado.');
      const { error } = await supabase.from('legal_acceptances').upsert(
        documents.map((document) => ({
          profile_id: profile.id,
          document,
          version: LEGAL_VERSIONS[document],
          user_agent: navigator.userAgent.slice(0, 300),
        })),
        { onConflict: 'profile_id,document,version', ignoreDuplicates: true },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['legal-acceptances', profile?.id] }),
  });

  return {
    missing,
    // Sem perfil ainda (cadastro em andamento) não há o que exigir.
    isLoading: isLoadingProfile || (!!profile?.id && acceptancesQuery.isLoading),
    isError: acceptancesQuery.isError,
    isOrganizer: profile?.role === 'professional',
    accept: accept.mutateAsync,
    isAccepting: accept.isPending,
  };
}
