import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Timezone-safe "today" for São Paulo
function todaySP(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export function useSessions() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();

  // Fetch all active sessions (For the Feed) — no PII
  const feedQuery = useQuery({
    queryKey: ['sessions', 'feed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, title, description, date, start_time, duration_minutes,
          location_name, location_address, max_participants, current_participants,
          price_per_slot, status, session_type, skill_level, category_id, kind,
          professional:profiles(id, full_name, avatar_url, rating_avg, public_slug),
          category:categories(name, icon, emoji)
        `)
        .in('status', ['active', 'full'])
        .gte('date', todaySP())
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const createSession = useMutation({
    mutationFn: async (sessionData: Omit<TablesInsert<'sessions'>, 'professional_id'>) => {
      if (!profile?.id) throw new Error('Professional profile not found');
      const { data, error } = await supabase
        .from('sessions')
        .insert({ ...sessionData, professional_id: profile.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const updateSession = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: TablesUpdate<'sessions'> }) => {
      const { data: updatedData, error } = await supabase
        .from('sessions')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return updatedData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.id] });
    },
  });

  return {
    feed: feedQuery.data,
    isLoadingFeed: feedQuery.isLoading,
    createSession: createSession.mutateAsync,
    isCreating: createSession.isPending,
    updateSession: updateSession.mutateAsync,
    isUpdating: updateSession.isPending,
  };
}


export function useSessionById(id: string) {
  return useQuery({
    queryKey: ['sessions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          professional:profiles(id, full_name, avatar_url, rating_avg, public_slug),
          category:categories(name, emoji)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
}
