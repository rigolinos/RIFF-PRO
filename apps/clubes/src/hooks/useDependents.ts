import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';
import { LEGAL_VERSIONS } from '@riff/core/legal/documents';

export type Relationship = 'child' | 'grandchild' | 'ward' | 'other';

export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  child: 'Filho ou filha',
  grandchild: 'Neto ou neta',
  ward: 'Sob minha guarda ou tutela',
  other: 'Outro parentesco',
};

/** Idade completa em anos numa data (AAAA-MM-DD). */
export function ageOn(birthDate: string, onDate: string) {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [y, m, d] = onDate.split('-').map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

const ERRORS: Record<string, string> = {
  consent_required: 'Aceite o Termo do Responsável para continuar.',
  invalid_birth_date: 'Confira a data de nascimento.',
  not_a_minor: 'Só menores de 18 anos são cadastrados como dependentes. Maiores criam a própria conta.',
  too_many_dependents: 'Limite de 10 dependentes atingido.',
  not_found: 'Dependente não encontrado.',
};

const translate = (error: { message?: string }, fallback: string) => {
  const key = Object.keys(ERRORS).find((k) => error.message?.includes(k));
  return new Error(key ? ERRORS[key] : fallback);
};

/** Dependentes ativos de quem está logado (removidos ficam anônimos e somem). */
export function useDependents() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dependents', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dependents')
        .select('id, full_name, birth_date, relationship')
        .eq('guardian_id', profile!.id)
        .is('removed_at', null)
        .order('birth_date', { ascending: true });
      if (error) throw error;
      return (data ?? []).filter((d): d is typeof d & { full_name: string; birth_date: string } => !!d.full_name && !!d.birth_date);
    },
    enabled: !!profile?.id,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dependents', profile?.id] });
    queryClient.invalidateQueries({ queryKey: ['community-agenda'] });
  };

  const add = useMutation({
    mutationFn: async (input: { fullName: string; birthDate: string; relationship: Relationship }) => {
      const { error } = await supabase.rpc('add_dependent', {
        p_full_name: input.fullName,
        p_birth_date: input.birthDate,
        p_relationship: input.relationship,
        p_consent_version: LEGAL_VERSIONS.guardian_consent,
      });
      if (error) throw translate(error, 'Não foi possível cadastrar o dependente.');
    },
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: async (dependentId: string) => {
      const { error } = await supabase.rpc('remove_dependent', { p_dependent: dependentId });
      if (error) throw translate(error, 'Não foi possível remover o dependente.');
    },
    onSuccess: refresh,
  });

  return { ...query, add, remove };
}

export type Dependent = NonNullable<ReturnType<typeof useDependents>['data']>[number];
