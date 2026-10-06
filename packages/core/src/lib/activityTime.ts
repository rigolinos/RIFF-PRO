/** Agora no horário de Brasília, como "AAAA-MM-DDTHH:mm" (mesmo formato de date + start_time). */
export function nowSP() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/**
 * Situação da atividade para quem quer se inscrever:
 * - open: ainda não começou e está ativa (ou lotada)
 * - live: acontecendo agora
 * - ended: já terminou (ou foi encerrada pelo organizador)
 * - cancelled: cancelada
 * Mesma regra do banco (create_booking compara com now_sp()).
 */
export type ActivityPhase = 'open' | 'live' | 'ended' | 'cancelled';

type ActivityTime = { date: string; start_time: string; duration_minutes?: number | null; status?: string | null };

export function activityPhase(a: ActivityTime, now: string): ActivityPhase {
  if (a.status === 'cancelled') return 'cancelled';
  if (a.status === 'completed') return 'ended';
  const start = `${a.date}T${a.start_time.slice(0, 5)}`;
  if (now < start) return 'open';
  const end = new Date(new Date(`${start}:00Z`).getTime() + (a.duration_minutes ?? 60) * 60_000).toISOString().slice(0, 16);
  return now < end ? 'live' : 'ended';
}

/** Texto curto da situação (selo e aviso no rodapé) */
export const PHASE_LABEL: Record<Exclude<ActivityPhase, 'open'>, { pill: string; message: string }> = {
  live: { pill: 'Acontecendo agora', message: 'Esta atividade já começou. As inscrições fecharam no horário de início.' },
  ended: { pill: 'Encerrada', message: 'Esta atividade já aconteceu. As inscrições estão fechadas.' },
  cancelled: { pill: 'Cancelada', message: 'Esta atividade foi cancelada por quem organiza.' },
};
