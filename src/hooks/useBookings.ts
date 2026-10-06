import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';

export function useBookings() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();

  // Fetch student bookings — no PII fields from profiles
  const studentBookingsQuery = useQuery({
    queryKey: ['bookings', 'student', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, session_id, professional_id, student_id,
          status, payment_status, amount_total, cancelled_at,
          checked_in, attendance_status, created_at, updated_at,
          review:reviews(id),
          session:sessions(
            id, title, date, start_time, status, location_name, location_address,
            price_per_slot, category_id, duration_minutes,
            category:categories(name, emoji, slug)
          ),
          professional:profiles!bookings_professional_id_fkey(
            id, full_name, avatar_url
          )
        `)
        .eq('student_id', profile.id)
        .eq('product', 'pro')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Cancel a booking (student) — server enforces 4h rule and status transition
  const cancelBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled_by_student',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select('id');

      if (error) {
        // Map server-side error codes to user-friendly messages
        if (error.message?.includes('late_cancellation')) {
          throw new Error('Cancelamento tardio: só é possível cancelar até 4 horas antes da atividade.');
        }
        if (error.message?.includes('invalid_status_transition')) {
          throw new Error('Esta reserva não pode mais ser cancelada.');
        }
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Não foi possível cancelar esta reserva.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'student'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  return {
    bookings: studentBookingsQuery.data,
    isLoading: studentBookingsQuery.isLoading,
    isError: studentBookingsQuery.isError,
    error: studentBookingsQuery.error,
    cancelBooking: cancelBooking.mutateAsync,
    isCanceling: cancelBooking.isPending,
  };
}
