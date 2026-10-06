import { Clock, HeartHandshake, PartyPopper, Star, Users, type LucideIcon } from 'lucide-react';

// Elogios pós-jogo: só positivos (mesma lista do banco, game_kudos.tag)
export type KudosTag = 'craque' | 'fair_play' | 'pontual' | 'bom_de_grupo' | 'animou';

export const KUDOS: { tag: KudosTag; label: string; icon: LucideIcon }[] = [
  { tag: 'craque', label: 'Craque', icon: Star },
  { tag: 'fair_play', label: 'Fair play', icon: HeartHandshake },
  { tag: 'pontual', label: 'Pontual', icon: Clock },
  { tag: 'bom_de_grupo', label: 'Bom de grupo', icon: Users },
  { tag: 'animou', label: 'Animou', icon: PartyPopper },
];

/** Pontos do ranking do mês (mesmas regras do banco, community_ranking) */
export const POINTS = { presence: 10, organized: 15, kudos: 3, review: 2 } as const;
