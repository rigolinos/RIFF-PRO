import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';
import { errorMessage } from '@riff/core/lib/utils';

// Data de hoje no fuso de São Paulo (AAAA-MM-DD)
export const todaySP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

/** A comunidade e o papel da pessoa nela (só membros ativos enxergam: RLS do C2). Qualquer membro cria atividade. */
export function useCommunity(orgId: string | undefined) {
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['community', orgId, profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('role, organization:organizations(id, name, kind, main_venue_id)')
        .eq('organization_id', orgId!)
        .eq('profile_id', profile!.id)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      if (!data?.organization) return null;
      return {
        ...data.organization,
        role: data.role,
        isAdmin: data.role === 'owner' || data.role === 'admin',
      };
    },
    enabled: !!orgId && !!profile?.id,
  });
}

const BOOKING_ERRORS: Record<string, string> = {
  not_member: 'Só membros da comunidade podem se inscrever.',
  session_full: 'As vagas acabaram.',
  session_started: 'A atividade já começou.',
  session_unavailable: 'Esta atividade não está mais disponível.',
  already_booked: 'Já existe inscrição.',
  minors_not_allowed: 'Esta atividade não aceita menores.',
  below_min_age: 'O dependente ainda não tem a idade mínima da atividade.',
  dependent_adult: 'Com 18 anos ou mais, a pessoa precisa da própria conta.',
  dependent_not_found: 'Dependente não encontrado.',
  self_booking: 'Você é quem conduz esta atividade.',
};

/** Inscrever e cancelar (sem pagamento no Clubes v1). */
export function useAgendaActions() {
  const queryClient = useQueryClient();
  // a mesma atividade aparece no início, na comunidade, no detalhe e na agenda pessoal
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['community-agenda'] });

  const book = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.rpc('create_booking', { p_session_id: sessionId, p_source: 'other' });
      if (error) throw error;
      const result = data as { success: boolean; code: string };
      if (!result.success) throw new Error(BOOKING_ERRORS[result.code] ?? 'Não foi possível fazer a inscrição.');
    },
    onSuccess: refresh,
  });

  const cancel = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled_by_student', cancelled_at: new Date().toISOString(), cancellation_reason: 'cancelado pelo membro' })
        .eq('id', bookingId);
      if (error) {
        if (error.message?.includes('late_cancellation')) {
          throw new Error('Faltam menos de 4 horas: avise quem conduz a atividade.');
        }
        throw new Error(errorMessage(error, 'Não foi possível cancelar.'));
      }
    },
    onSuccess: refresh,
  });

  const bookDependent = useMutation({
    mutationFn: async ({ sessionId, dependentId }: { sessionId: string; dependentId: string }) => {
      const { data, error } = await supabase.rpc('create_dependent_booking', { p_session_id: sessionId, p_dependent_id: dependentId });
      if (error) throw error;
      const result = data as { success: boolean; code: string };
      if (!result.success) throw new Error(BOOKING_ERRORS[result.code] ?? 'Não foi possível fazer a inscrição.');
    },
    onSuccess: refresh,
  });

  return { book, cancel, bookDependent };
}
