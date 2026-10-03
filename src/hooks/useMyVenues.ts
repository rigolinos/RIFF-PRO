import { useQuery } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';

// Locais que o organizador já usou (criados automaticamente a partir das atividades).
export function useMyVenues() {
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['venues', 'mine', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, address, kind')
        .eq('created_by', profile!.id)
        .order('updated_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  });
}
