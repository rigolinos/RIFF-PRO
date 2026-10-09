import { useQuery } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { activityPhase, nowSP } from '@riff/core/lib/activityTime';

// Timezone-safe "today" for São Paulo
function todaySP(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export function usePublicProfile(slugOrId: string) {
  return useQuery({
    queryKey: ['public-profile', slugOrId],
    queryFn: async () => {
      // Try by slug first, fallback to ID (perfil excluído o banco já esconde)
      let { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, city, state, role, professional_type, credential_type, credential_number, credential_verified, specialties, experience_years, public_slug, instagram_handle, rating_avg, total_reviews, total_sessions_given, total_students_served')
        .eq('public_slug', slugOrId)
        .single();

      if (!profile && slugOrId.includes('-')) {
        const { data: profileById } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio, city, state, role, professional_type, credential_type, credential_number, credential_verified, specialties, experience_years, public_slug, instagram_handle, rating_avg, total_reviews, total_sessions_given, total_students_served')
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
          price_per_slot, status, session_type, skill_level, kind,
          category:categories(name, emoji, slug),
          professional:profiles!sessions_professional_id_fkey(id, full_name, avatar_url, public_slug, rating_avg, total_reviews)
        `)
        .eq('professional_id', profile.id)
        .eq('product', 'pro')
        .in('status', ['active', 'full'])
        .gte('date', todaySP())
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      // Avaliações da vitrine: sem quem avaliou nem a reserva (só primeiro nome e foto)
      const { data: publicReviews } = await supabase.rpc('public_reviews', { p_professional: profile.id, p_limit: 20 });
      const reviews = (publicReviews ?? []).map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        reviewer: { full_name: r.reviewer_name, avatar_url: r.reviewer_avatar },
      }));

      return {
        profile,
        // as de hoje que já começaram não aceitam mais inscrição
        sessions: (sessions || []).filter((s) => activityPhase(s, nowSP()) === 'open'),
        reviews: reviews || []
      };
    },
    enabled: !!slugOrId,
  });
}
