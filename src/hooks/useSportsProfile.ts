import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';
import type { Achievement } from '@riff/core/lib/achievements';

export type ProPerson = { id: string | null; name: string; avatar_url: string | null };
/** Quem vai: a contagem é pública; fotos e nomes só para quem reservou e quem organiza */
export type ProParticipants = { count: number; people: ProPerson[] | null };

export type ProSportsProfile = {
  games: number;
  attendance: number | null;
  sports: { slug: string | null; name: string; n: number }[];
  venues: { name: string; n: number }[];
  organizers: { id: string; name: string; avatar_url: string | null; public_slug: string | null; n: number }[];
  reviews_given: number;
  achievements: Achievement[];
};

export function useProParticipants(sessionId: string | undefined) {
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['pro-participants', sessionId, profile?.id ?? null],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('pro_session_participants', { p_session: sessionId! });
      if (error) throw error;
      return data as unknown as ProParticipants | null;
    },
    enabled: !!sessionId,
  });
}

/** Perfil esportista pessoal (só a própria pessoa vê) */
export function useMySportsProfile() {
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['my-sports-profile', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_pro_sports_profile');
      if (error) throw error;
      return data as unknown as ProSportsProfile | null;
    },
    enabled: !!profile?.id,
  });
}

type ReviewInput = { bookingId: string; sessionId: string; professionalId: string; rating: number; tags: string[]; comment: string };

export function useSubmitProReview() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (r: ReviewInput) => {
      if (!profile) throw new Error('Entre na sua conta para avaliar.');
      const { error } = await supabase.from('reviews').insert({
        booking_id: r.bookingId,
        session_id: r.sessionId,
        professional_id: r.professionalId,
        reviewer_id: profile.id,
        rating: r.rating,
        tags: r.tags.length ? r.tags : null,
        comment: r.comment.trim() || null,
      });
      if (error?.code === '23505') throw new Error('Você já avaliou esta atividade.');
      if (error?.message?.includes('row-level security')) throw new Error('Esta atividade ainda não pode ser avaliada.');
      if (error) throw error;
    },
    // a lista de reservas é atualizada quando a pessoa sai da avaliação (senão a tela some antes da recompensa)
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-sports-profile'] }),
  });
}
