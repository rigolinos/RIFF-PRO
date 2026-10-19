import { KINDS, type ActivityKind } from '@riff/core/lib/copy';

/** O que a pessoa preenche ao criar um evento no Riff Clubes */
export type EventValues = {
  kind: ActivityKind;
  category_id: string;
  sport_other: string | null;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  place: string;
  /** espaço oficial escolhido (null = lugar escrito à mão) */
  space_id: string | null;
  spots: number;
  /** null = ainda não respondeu "crianças e adolescentes podem participar?" */
  minors_allowed: boolean | null;
  min_age: string;
  /** quem cria também vai jogar (null = segue o padrão do tipo) */
  organizer_plays: boolean | null;
};

export type EventStep = 'sport' | 'when' | 'where' | 'spots' | 'name';
export const EVENT_STEPS: EventStep[] = ['sport', 'when', 'where', 'spots', 'name'];

export const QUICK_TIMES = ['07:00', '08:00', '09:00', '18:00', '19:00', '20:00'];
export const DURATIONS = [30, 45, 60, 90, 120];
export const durationLabel = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60}h`);

/** Instrutor começa em Aula; morador, em Jogo (dá para trocar) */
export const emptyEvent = (kind: ActivityKind): EventValues => ({
  kind,
  category_id: '',
  sport_other: null,
  title: '',
  description: '',
  date: '',
  time: '',
  duration: KINDS[kind].defaultDuration,
  place: '',
  space_id: null,
  spots: 10,
  minors_allowed: null,
  min_age: '',
  organizer_plays: null,
});

/** Em jogo e evento quem cria costuma jogar; em aula e campeonato, não */
export const eventOrganizerPlays = (v: EventValues) => v.organizer_plays ?? (v.kind === 'match' || v.kind === 'event');

/** O que falta para seguir do passo (null = pode seguir). `now` no formato de nowSP(). */
export function eventStepMissing(step: EventStep, v: EventValues, now: string): string | null {
  switch (step) {
    case 'sport':
      return v.category_id ? null : 'Escolha o esporte.';
    case 'when':
      if (!v.date) return 'Escolha o dia.';
      if (!v.time) return 'Escolha o horário.';
      return `${v.date}T${v.time.slice(0, 5)}` <= now ? 'Esse horário já passou. Escolha outro.' : null;
    case 'where':
      return v.place.trim() ? null : 'Escolha o espaço ou escreva o lugar.';
    case 'spots':
      if (!(v.spots >= 1)) return 'Informe quantas vagas o evento tem.';
      if (v.minors_allowed === null) return 'Responda se crianças e adolescentes podem participar.';
      if (v.minors_allowed && v.min_age !== '' && !(Number(v.min_age) >= 0 && Number(v.min_age) <= 17)) return 'A idade mínima vai de 0 a 17 anos.';
      return null;
    case 'name':
      return v.title.trim() ? null : 'Dê um nome para o evento.';
  }
}

export const firstEventMissing = (v: EventValues, now: string) => EVENT_STEPS.find((s) => eventStepMissing(s, v, now)) ?? null;

/** Convite para o grupo de WhatsApp do condomínio ou clube */
export function eventInvite(e: { title: string; when: string; place: string; community: string; url: string }) {
  return `Bora? "${e.title}" no ${e.community}: ${e.when}, ${e.place}. Inscreva-se pelo Riff Clubes: ${e.url}`;
}
