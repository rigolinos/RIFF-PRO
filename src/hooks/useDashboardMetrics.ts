import { useQuery } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { useAuth } from '@riff/core/hooks/useAuth';

// Timezone-safe "today" for São Paulo
function todaySP(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export function useDashboardMetrics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-metrics', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Call the new parameterless RPC
      const { data: metrics, error: metricsError } = await supabase.rpc('get_professional_dashboard');

      if (metricsError) throw metricsError;

      // Get the profile id for the next session query
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) return { metrics, nextSession: null, todaySessions: [] };

      // Atividades de hoje (data no fuso de São Paulo)
      const { data: todaySessions } = await supabase
        .from('sessions')
        .select('id, title, date, start_time, duration_minutes, location_name, current_participants, max_participants, status, category:categories(name, emoji)')
        .eq('professional_id', profileData.id)
        .eq('product', 'pro')
        .in('status', ['active', 'full'])
        .eq('date', todaySP())
        .order('start_time', { ascending: true });

      const { data: nextSession } = await supabase
        .from('sessions')
        .select('id, title, date, start_time, duration_minutes, location_name, current_participants, max_participants, status, category:categories(name, emoji)')
        .eq('professional_id', profileData.id)
        .eq('product', 'pro')
        .in('status', ['active', 'full'])
        .gte('date', todaySP())
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(1)
        .single();

      return {
        metrics,
        nextSession,
        todaySessions: todaySessions ?? [],
      };
    },
    enabled: !!user?.id,
  });
}
