import { CalendarCheck, Flame, HeartHandshake, MapPin, Megaphone, Shapes, type LucideIcon } from 'lucide-react';

/** Conquista calculada pelo banco (player_profile, my_pro_sports_profile) */
export type Achievement = { key: string; current: number; target: number; detail?: string | null };

// Nome, ícone e explicação de cada conquista (Riff Pro e Riff Clubes)
export const ACHIEVEMENTS: Record<string, { title: string; icon: LucideIcon; hint: (detail?: string | null) => string }> = {
  dono_da_quadra: { title: 'Dono da quadra', icon: MapPin, hint: (d) => `jogos no mesmo lugar${d ? ` (${d})` : ''}` },
  assiduo: { title: 'Assíduo', icon: Flame, hint: () => 'semanas seguidas jogando' },
  organizador: { title: 'Organizador', icon: Megaphone, hint: () => 'eventos organizados' },
  pontual: { title: 'Pontual', icon: CalendarCheck, hint: () => 'presenças sem atraso' },
  multiesportista: { title: 'Multiesportista', icon: Shapes, hint: () => 'esportes diferentes' },
  fiel: { title: 'Fiel', icon: HeartHandshake, hint: (d) => `atividades com o mesmo organizador${d ? ` (${d})` : ''}` },
};

/** A conquista mais perto de sair (para a tela de recompensa) */
export const nextAchievement = (list: Achievement[] | undefined) =>
  (list ?? []).filter((a) => a.current < a.target).sort((a, b) => b.current / b.target - a.current / a.target)[0];
