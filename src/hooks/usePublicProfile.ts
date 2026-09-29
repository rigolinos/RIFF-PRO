import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Timezone-safe "today" for São Paulo
function todaySP(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export function usePublicProfile(slugOrId: string) {
  return useQuery({
    queryKey: ['public-profile', slugOrId],
    queryFn: async () => {
      // Try by slug first, fallback to ID
      let { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, city, state, role, professional_type, credential_type, credential_number, specialties, experience_years, public_slug, instagram_handle, rating_avg, total_reviews, total_sessions_given, total_students_served')
        .eq('public_slug', slugOrId)
        .single();

      if (!profile && slugOrId.includes('-')) {
        const { data: profileById } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio, city, state, role, professional_type, credential_type, credential_number, specialties, experience_years, public_slug, instagram_handle, rating_avg, total_reviews, total_sessions_given, total_students_served')
          .eq('id', slugOrId)
          .single();
        profile = profileById;
      }

      if (!profile) throw new Error('Perfil não encontrado');

      // Fetch active sessions — no PII in the professional join
      const { data: sessions } = await supabase
        .from('sessions')
        .select(`
          id, title, description, date, start_time, duration_minutes,
          location_name, location_address, max_participants, current_participants,
          price_per_slot, status, session_type, skill_level,
          category:categories(name, emoji),
          professional:profiles!sessions_professional_id_fkey(id, full_name, avatar_url, public_slug, rating_avg)
        `)
        .eq('professional_id', profile.id)
        .in('status', ['active', 'full'])
        .gte('date', todaySP())
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      // Fetch reviews
      const { data: reviews } = await supabase
        .from('reviews')
        .select(`
          id, rating, comment, created_at,
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
