import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';
import type { KudosTag } from '@/lib/sports';

export type Player = { id: string; name: string; avatar_url: string | null };

/** Jogos que a pessoa jogou ou organizou nos últimos 3 dias e ainda não avaliou. */
export function usePendingReviews() {
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['pending-reviews', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('pending_game_reviews');
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, players: (r.players ?? []) as Player[] }));
    },
    enabled: !!profile?.id,
  });
}

export type PendingReview = NonNullable<ReturnType<typeof usePendingReviews>['data']>[number];

const REVIEW_ERRORS: Record<string, string> = {
  already_reviewed: 'Você já avaliou este jogo.',
  review_closed: 'O prazo para avaliar este jogo acabou.',
  not_ended: 'O jogo ainda não terminou.',
  not_a_player: 'Só quem jogou pode avaliar.',
  invalid_kudos: 'Um dos elogios não pôde ser enviado. Tente de novo.',
};

export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sessionId: string; vibe: 1 | 2 | 3; kudos: { receiver: string; tag: KudosTag }[] }) => {
      const { error } = await supabase.rpc('submit_game_review', {
        p_session: input.sessionId,
        p_vibe: input.vibe,
        p_kudos: input.kudos,
      });
      if (error) {
        const key = Object.keys(REVIEW_ERRORS).find((k) => error.message?.includes(k));
        throw new Error(key ? REVIEW_ERRORS[key] : 'Não foi possível enviar a avaliação.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['player-profile'] });
      queryClient.invalidateQueries({ queryKey: ['ranking'] });
    },
  });
}

export type PlayerProfile = {
  id: string;
  name: string;
  avatar_url: string | null;
  hidden: boolean;
  member_since: string | null;
  games: number;
  organized: number;
  attendance: number | null;
  sports: { slug: string | null; name: string; n: number }[];
  venues: { name: string | null; n: number }[];
  kudos: Partial<Record<KudosTag, number>>;
  month_rank: number | null;
  month_points: number | null;
  achievements: { key: string; current: number; target: number; detail?: string | null }[];
};

/** Perfil esportista: da própria pessoa (orgId opcional) ou de um vizinho (orgId obrigatório). */
export function usePlayerProfile(profileId: string | undefined, orgId?: string | null) {
  return useQuery({
    queryKey: ['player-profile', profileId, orgId ?? null],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('player_profile', {
        p_profile: profileId!,
        ...(orgId ? { p_org: orgId } : {}),
      });
      if (error) throw error;
      return (data ?? null) as PlayerProfile | null;
    },
    enabled: !!profileId,
  });
}
