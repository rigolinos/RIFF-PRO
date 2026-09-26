import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

export function useBookings() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();

  // Fetch as reservas do Aluno logado
  const studentBookingsQuery = useQuery({
    queryKey: ['bookings', 'student', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          session:sessions(
            id, title, date, start_time, location_name, location_address, price_per_slot, category_id,
            category:categories(name, emoji)
          ),
          professional:profiles!bookings_professional_id_fkey(
            id, full_name, avatar_url, phone, whatsapp_number, pix_key
          )
        `)
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Cancelar uma reserva (Aluno)
  const cancelBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled_by_student',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Importante: No mundo real também iríamos disparar via trigger 
      // ou edge function a redução de current_participants na sessão.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'student'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  return {
    bookings: studentBookingsQuery.data,
    isLoading: studentBookingsQuery.isLoading,
    cancelBooking: cancelBooking.mutateAsync,
    isCanceling: cancelBooking.isPending,
  };
}
