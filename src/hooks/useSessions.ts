import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export function useSessions() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();

  // Fetch all active sessions (For the Feed)
  const feedQuery = useQuery({
    queryKey: ['sessions', 'feed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          professional:profiles(id, full_name, avatar_url, rating_avg, public_slug),
          category:categories(name, icon, emoji)
        `)
        .in('status', ['active', 'full'])
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const getSessionById = (id: string) => {
    return useQuery({
      queryKey: ['sessions', id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('sessions')
          .select(`*, professional:profiles(id, full_name, avatar_url, rating_avg, public_slug), category:categories(name, icon, emoji)`)
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      },
      enabled: !!id,
    });
  };

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
    getSessionById,
    createSession: createSession.mutateAsync,
    isCreating: createSession.isPending,
    updateSession: updateSession.mutateAsync,
    isUpdating: updateSession.isPending,
  };
}
