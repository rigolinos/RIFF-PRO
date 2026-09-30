import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

export function useProSessions() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();

  // Fetch pro's sessions with participants — no PII leaked from student profiles
  const proSessionsQuery = useQuery({
    queryKey: ['sessions', 'pro', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, title, description, date, start_time, duration_minutes,
          location_name, location_address, max_participants, current_participants,
          price_per_slot, status, session_type, category_id, kind,
          category:categories(name, emoji),
          bookings(
            id, status, payment_status, amount_total, checked_in, created_at,
            student:profiles!bookings_student_id_fkey(
              id, full_name, avatar_url
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

  // Confirm payment — check affected rows
  const confirmPayment = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string, status: 'pending' | 'paid' }) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({
          payment_status: status,
          payment_confirmed_at: status === 'paid' ? new Date().toISOString() : null,
        })
        .eq('id', bookingId)
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Não foi possível confirmar o pagamento. Verifique se a reserva ainda está ativa.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', 'pro'] });
    },
  });

  // Cancel session via RPC
  const cancelSession = useMutation({
    mutationFn: async ({ sessionId, reason }: { sessionId: string; reason?: string }) => {
      const { error } = await supabase.rpc('cancel_session', {
        p_session_id: sessionId,
        p_reason: reason ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', 'pro'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  // Close session via RPC (encerramento)
  const closeSession = useMutation({
    mutationFn: async ({
      sessionId,
      attendance,
      happened = true,
      notes,
    }: {
      sessionId: string;
      attendance: Array<{ booking_id: string; attended: boolean; paid: boolean; note?: string }>;
      happened?: boolean;
      notes?: string;
    }) => {
      const { error } = await supabase.rpc('close_session', {
        p_session_id: sessionId,
        p_attendance: attendance,
        p_happened: happened,
        p_notes: notes ?? undefined,
      });

      if (error) {
        if (error.message?.includes('session_not_started')) {
          throw new Error('A atividade ainda não começou. Aguarde o horário de início.');
        }
        if (error.message?.includes('forbidden_or_invalid_state')) {
          throw new Error('Sem permissão ou a atividade já foi encerrada.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', 'pro'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  // Update session status directly (e.g. 'full' to close registrations)
  const updateSessionStatus = useMutation({
    mutationFn: async ({ sessionId, status }: { sessionId: string; status: 'active' | 'full' | 'cancelled' | 'completed' | 'draft' }) => {
      const { data, error } = await supabase
        .from('sessions')
        .update({ status })
        .eq('id', sessionId)
        .select('id');
      
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Ação não permitida ou sessão não encontrada.");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  return {
    sessions: proSessionsQuery.data,
    isLoading: proSessionsQuery.isLoading,
    confirmPayment: confirmPayment.mutateAsync,
    cancelSession: cancelSession.mutateAsync,
    closeSession: closeSession.mutateAsync,
    updateSessionStatus: updateSessionStatus.mutateAsync,
  };
}
