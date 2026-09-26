import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

export function useProSessions() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();

  // Fetch das sessões criadas pelo profissional COM a lista de participantes
  const proSessionsQuery = useQuery({
    queryKey: ['sessions', 'pro', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          category:categories(name, emoji),
          bookings(
            id, status, payment_status, amount_total, created_at,
            student:profiles!bookings_student_id_fkey(
              id, full_name, phone, whatsapp_number, avatar_url
            )
          )
        `)
        .eq('professional_id', profile.id)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Marcar pagamento como recebido
  const confirmPayment = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string, status: 'pending' | 'paid' }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: status })
        .eq('id', bookingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', 'pro'] });
    },
  });

  return {
    sessions: proSessionsQuery.data,
    isLoading: proSessionsQuery.isLoading,
    confirmPayment: confirmPayment.mutateAsync,
  };
}
