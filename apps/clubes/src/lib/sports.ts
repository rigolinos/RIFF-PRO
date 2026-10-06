import { CalendarCheck, Clock, Flame, HeartHandshake, MapPin, Megaphone, PartyPopper, Shapes, Star, Users, type LucideIcon } from 'lucide-react';

// Elogios pós-jogo: só positivos (mesma lista do banco, game_kudos.tag)
export type KudosTag = 'craque' | 'fair_play' | 'pontual' | 'bom_de_grupo' | 'animou';

export const KUDOS: { tag: KudosTag; label: string; icon: LucideIcon }[] = [
  { tag: 'craque', label: 'Craque', icon: Star },
  { tag: 'fair_play', label: 'Fair play', icon: HeartHandshake },
  { tag: 'pontual', label: 'Pontual', icon: Clock },
  { tag: 'bom_de_grupo', label: 'Bom de grupo', icon: Users },
  { tag: 'animou', label: 'Animou', icon: PartyPopper },
];

// Conquistas calculadas pelo banco (player_profile.achievements)
export const ACHIEVEMENTS: Record<string, { title: string; icon: LucideIcon; hint: (detail?: string | null) => string }> = {
  dono_da_quadra: { title: 'Dono da quadra', icon: MapPin, hint: (d) => `jogos no mesmo lugar${d ? ` (${d})` : ''}` },
  assiduo: { title: 'Assíduo', icon: Flame, hint: () => 'semanas seguidas jogando' },
  organizador: { title: 'Organizador', icon: Megaphone, hint: () => 'eventos organizados' },
  pontual: { title: 'Pontual', icon: CalendarCheck, hint: () => 'presenças sem atraso' },
  multiesportista: { title: 'Multiesportista', icon: Shapes, hint: () => 'esportes diferentes' },
};

/** Pontos do ranking do mês (mesmas regras do banco, community_ranking) */
export const POINTS = { presence: 10, organized: 15, kudos: 3, review: 2 } as const;
