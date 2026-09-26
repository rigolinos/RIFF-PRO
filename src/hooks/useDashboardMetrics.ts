import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useDashboardMetrics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-metrics', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Chama a RPC construída no banco
      const { data: metrics, error: metricsError } = await supabase.rpc('get_professional_dashboard', {
        p_user_id: user.id
      });

      if (metricsError) throw metricsError;

      // Busca a próxima aula imediata para o card de destaque
      const { data: nextSession } = await supabase
        .from('sessions')
        .select('*, bookings(id)')
        .eq('professional_id', (await supabase.from('profiles').select('id').eq('user_id', user!.id).single()).data?.id || '')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(1)
        .single();

      return {
        metrics,
        nextSession
      };
    },
    enabled: !!user?.id,
  });
}
