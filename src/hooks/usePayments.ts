import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';

/**
 * Reservas pagas que esperam o organizador confirmar o Pix (de atividades que não foram
 * canceladas). O organizador confirma a qualquer momento, não só na chamada.
 */
export function usePendingPayments() {
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['pending-payments', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, amount_total, created_at,
          session:sessions!inner(id, title, date, start_time, status),
          student:profiles!bookings_student_id_fkey(full_name, avatar_url)
        `)
        .eq('professional_id', profile!.id)
        .eq('product', 'pro')
        .eq('payment_status', 'pending')
        .in('status', ['pending', 'confirmed'])
        .neq('session.status', 'cancelled')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).filter((b) => Number(b.amount_total ?? 0) > 0);
    },
    enabled: !!profile?.id && profile.role === 'professional',
  });
}

export type PendingPayment = NonNullable<ReturnType<typeof usePendingPayments>['data']>[number];

/** Confirmar que recebeu (ou desfazer): grava na reserva; a vaga do participante fica garantida */
export function useConfirmPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, paid }: { bookingId: string; paid: boolean }) => {
      const { data, error } = await supabase
        .from('bookings')
        .update(
          paid
            ? { payment_status: 'paid', payment_confirmed_at: new Date().toISOString(), status: 'confirmed' }
            : { payment_status: 'pending', payment_confirmed_at: null },
        )
        .eq('id', bookingId)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Não foi possível confirmar. Veja se a reserva ainda está ativa.');
    },
    onSuccess: () => {
      for (const key of ['pending-payments', 'earnings', 'session-attendance', 'dashboard-metrics']) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      void queryClient.invalidateQueries({ queryKey: ['sessions', 'pro'] });
    },
  });
}
