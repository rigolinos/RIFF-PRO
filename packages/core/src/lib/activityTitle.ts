import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ActivityKind } from '@riff/core/lib/copy';

const PREFIX: Record<ActivityKind, string> = {
  class: 'Aula de',
  match: 'Jogo de',
  tournament: 'Campeonato de',
  event: '',
  other: '',
};

/** "de manhã", "à tarde" ou "à noite", pelo horário de início (HH:mm) */
export function dayPeriod(time: string): string {
  const hour = Number(time.slice(0, 2));
  return hour < 12 ? 'de manhã' : hour < 18 ? 'à tarde' : 'à noite';
}

/**
 * Nome sugerido para a atividade a partir do que já foi escolhido:
 * "Aula de Yoga · sábado de manhã". O nome é o mais difícil de inventar; a sugestão
 * deixa a pessoa só ajustar. Usado no Riff Pro e no Riff Clubes.
 */
export function suggestActivityTitle(a: { kind: ActivityKind; sport?: string | null; date?: string | null; time?: string | null }): string {
  const sport = a.sport?.trim();
  if (!sport) return '';
  const base = [PREFIX[a.kind], sport].filter(Boolean).join(' ');
  if (!a.date) return base;
  const weekday = format(parseISO(a.date), 'EEEE', { locale: ptBR });
  return `${base} · ${weekday}${a.time ? ` ${dayPeriod(a.time)}` : ''}`;
}
