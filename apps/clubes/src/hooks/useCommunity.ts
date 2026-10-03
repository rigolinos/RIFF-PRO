import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';
import { errorMessage } from '@riff/core/lib/utils';

// Data de hoje no fuso de São Paulo (AAAA-MM-DD)
export const todaySP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

const STAFF_ROLES = ['owner', 'admin', 'instructor'];

/** A comunidade e o papel da pessoa nela (só membros ativos enxergam: RLS do C2). */
export function useCommunity(orgId: string | undefined) {
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['community', orgId, profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('role, organization:organizations(id, name, kind)')
        .eq('organization_id', orgId!)
        .eq('profile_id', profile!.id)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      if (!data?.organization) return null;
      return {
        ...data.organization,
        role: data.role,
        canManage: STAFF_ROLES.includes(data.role),
        isAdmin: data.role === 'owner' || data.role === 'admin',
      };
    },
    enabled: !!orgId && !!profile?.id,
  });
}

/** Próximas atividades da comunidade, mais as reservas da pessoa nelas. */
export function useCommunityAgenda(orgId: string | undefined) {
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['community-agenda', orgId, profile?.id],
    queryFn: async () => {
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('id, title, date, start_time, duration_minutes, location_name, max_participants, current_participants, kind, status, category:categories(name, emoji), professional:profiles!sessions_professional_id_fkey(full_name)')
        .eq('organization_id', orgId!)
        .in('status', ['active', 'full'])
        .gte('date', todaySP())
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;

      const ids = (sessions ?? []).map((s) => s.id);
      const { data: bookings, error: bookingsError } = ids.length
        ? await supabase
            .from('bookings')
            .select('id, session_id, status')
            .eq('student_id', profile!.id)
            .in('session_id', ids)
            .in('status', ['pending', 'confirmed'])
        : { data: [], error: null };
      if (bookingsError) throw bookingsError;

      const myBooking = new Map((bookings ?? []).map((b) => [b.session_id, b.id]));
      return (sessions ?? []).map((s) => ({ ...s, myBookingId: myBooking.get(s.id) ?? null }));
    },
    enabled: !!orgId && !!profile?.id,
  });
}

export type AgendaItem = NonNullable<ReturnType<typeof useCommunityAgenda>['data']>[number];

const BOOKING_ERRORS: Record<string, string> = {
  not_member: 'Só membros da comunidade podem se inscrever.',
  session_full: 'As vagas acabaram.',
  session_started: 'A atividade já começou.',
  session_unavailable: 'Esta atividade não está mais disponível.',
  already_booked: 'Você já está inscrito.',
  self_booking: 'Você é quem conduz esta atividade.',
};

/** Inscrever e cancelar (sem pagamento no Clubes v1). */
export function useAgendaActions(orgId: string | undefined) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['community-agenda', orgId] });

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

  return { book, cancel };
}
