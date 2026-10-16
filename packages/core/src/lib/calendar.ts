/** Link "Adicionar ao Google Agenda" com dia e horário certos, no fuso de Brasília */

type CalendarActivity = {
  title: string;
  /** AAAA-MM-DD */
  date: string;
  /** HH:mm ou HH:mm:ss */
  start_time: string;
  duration_minutes?: number | null;
  location?: string | null;
  details?: string | null;
};

const stamp = (d: Date) => d.toISOString().slice(0, 19).replace(/[-:]/g, '');

export function googleCalendarUrl(a: CalendarActivity): string {
  // as contas são feitas como se fosse UTC e o fuso vai no ctz: o horário não muda com o fuso do celular
  const start = new Date(`${a.date}T${a.start_time.slice(0, 5)}:00Z`);
  const end = new Date(start.getTime() + (a.duration_minutes ?? 60) * 60_000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: a.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    ctz: 'America/Sao_Paulo',
  });
  if (a.location) params.set('location', a.location);
  if (a.details) params.set('details', a.details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
