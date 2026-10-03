import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ProfessionalInsights {
  paid_bookings_30d: number;
  bookings_30d: number;
  tracked_bookings: number;
  via_link: number;
  returning_participants: number;
  participants: number;
}

// Reservas pagas, recompra e quanto vem do link do organizador (get_professional_insights)
export function useProfessionalInsights() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['professional-insights', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_professional_insights');
      if (error) throw error;
      return data as unknown as ProfessionalInsights;
    },
    enabled: !!user?.id,
  });
}
