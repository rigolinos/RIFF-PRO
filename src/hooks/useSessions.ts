import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';
import { activityPhase, nowSP } from '@riff/core/lib/activityTime';
import type { TablesInsert, TablesUpdate } from '@riff/core/supabase/types';

// Timezone-safe "today" for São Paulo
function todaySP(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export function useCities() {
  return useQuery({
    queryKey: ['sessions', 'cities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('city')
        .eq('product', 'pro')
        .in('status', ['active', 'full'])
        .gte('date', todaySP());
      if (error) throw error;
      const cities = Array.from(new Set(data.map(d => d.city).filter(Boolean))) as string[];
      return cities.sort();
    }
  });
}

export const FEED_PAGE = 60;

/** Próximas atividades abertas do Riff Pro (Início), as `limit` mais próximas. Sem dados pessoais. */
export function useFeed(limit: number = FEED_PAGE) {
  return useQuery({
    queryKey: ['sessions', 'feed', limit],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, title, description, date, start_time, duration_minutes,
          location_name, location_address, max_participants, current_participants,
          price_per_slot, status, session_type, skill_level, category_id, kind, city,
          professional:profiles(id, full_name, avatar_url, rating_avg, total_reviews, public_slug),
          category:categories(name, icon, emoji, slug)
        `)
        .eq('product', 'pro')
        .in('status', ['active', 'full'])
        .gte('date', todaySP())
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(limit + 1); // uma a mais, só para saber se há mais para carregar

      if (error) throw error;
      // as de hoje que já começaram não aceitam mais inscrição
      const now = nowSP();
      return { sessions: data.slice(0, limit).filter((s) => activityPhase(s, now) === 'open'), hasMore: data.length > limit };
    },
  });
}

export function useSessions() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();

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
          professional:profiles(id, full_name, avatar_url, rating_avg, total_reviews, public_slug),
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
