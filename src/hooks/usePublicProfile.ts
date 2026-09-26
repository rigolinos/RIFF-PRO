import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePublicProfile(slugOrId: string) {
  return useQuery({
    queryKey: ['public-profile', slugOrId],
    queryFn: async () => {
      // Tenta buscar por slug, se falhar ou não achar, tenta por ID (fallback)
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('public_slug', slugOrId)
        .single();

      if (!profile && slugOrId.includes('-')) {
        const { data: profileById } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', slugOrId)
          .single();
        profile = profileById;
      }

      if (!profile) throw new Error('Perfil não encontrado');

      // Buscar sessões ativas deste profissional
      const { data: sessions } = await supabase
        .from('sessions')
        .select(`
          *,
          category:categories(name, emoji),
          professional:profiles!sessions_professional_id_fkey(id, full_name, avatar_url, public_slug, pix_key, phone, whatsapp_number, rating_avg)
        `)
        .eq('professional_id', profile.id)
        .in('status', ['active', 'full'])
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      // Buscar avaliações
      const { data: reviews } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)
        `)
        .eq('professional_id', profile.id)
        .order('created_at', { ascending: false });

      return {
        profile,
        sessions: sessions || [],
        reviews: reviews || []
      };
    },
    enabled: !!slugOrId,
  });
}
