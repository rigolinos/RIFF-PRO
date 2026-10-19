import { addDays, format, parseISO } from 'date-fns';
import { KINDS, type ActivityKind } from '@riff/core/lib/copy';
import type { Tables, TablesInsert } from '@riff/core/supabase/types';

/** O que a pessoa preenche no assistente de criar atividade */
export type SessionValues = {
  kind: ActivityKind;
  category_id: string;
  sport_other: string | null;
  title: string;
  description: string;
  what_to_bring: string;
  cover_image_url: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  location_name: string;
  location_address: string | null;
  latitude: number | null;
  longitude: number | null;
  meeting_point: string;
  city: string | null;
  /** Local já existente (repetir atividade); some quando a pessoa troca o lugar */
  venue_id: string | null;
  max_participants: number;
  price_per_slot: number;
  /** Quem organiza também vai jogar (null = segue o padrão do tipo) */
  organizer_plays: boolean | null;
  /** Campos sem pergunta no assistente, mantidos ao editar ou repetir */
  session_type: string | null;
  skill_level: string | null;
};

/** Em jogo e evento quem organiza costuma participar; em aula e campeonato, não */
export const playsByDefault = (kind: ActivityKind) => kind === 'match' || kind === 'event';
export const organizerPlays = (v: SessionValues) => v.organizer_plays ?? playsByDefault(v.kind);

export type StepId = 'kind' | 'sport' | 'when' | 'where' | 'spots' | 'name';
export const STEPS: StepId[] = ['kind', 'sport', 'when', 'where', 'spots', 'name'];

export const QUICK_TIMES = ['06:00', '07:00', '08:00', '09:00', '18:00', '19:00', '20:00'];
export const DURATIONS = [30, 45, 60, 90, 120];
export const PRICES = [0, 20, 30, 40, 50];

export const durationLabel = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60}h`);
export const todaySP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

export const emptyValues = (): SessionValues => ({
  kind: 'class',
  category_id: '',
  sport_other: null,
  title: '',
  description: '',
  what_to_bring: '',
  cover_image_url: '',
  date: '',
  start_time: '',
  duration_minutes: KINDS.class.defaultDuration,
  location_name: '',
  location_address: null,
  latitude: null,
  longitude: null,
  meeting_point: '',
  city: null,
  venue_id: null,
  max_participants: 10,
  price_per_slot: 0,
  organizer_plays: null,
  session_type: null,
  skill_level: null,
});

/** Valores de uma atividade que já existe (editar), ou dela uma semana depois (repetir) */
export function valuesFromSession(s: Tables<'sessions'>, opts: { nextWeek?: boolean } = {}): SessionValues {
  return {
    kind: s.kind ?? 'class',
    category_id: s.category_id,
    sport_other: s.sport_other ?? null,
    title: s.title ?? '',
    description: s.description ?? '',
    what_to_bring: s.what_to_bring ?? '',
    cover_image_url: s.cover_image_url ?? '',
    date: opts.nextWeek ? format(addDays(parseISO(s.date), 7), 'yyyy-MM-dd') : s.date,
    start_time: s.start_time?.slice(0, 5) ?? '',
    duration_minutes: s.duration_minutes ?? KINDS[s.kind ?? 'class'].defaultDuration,
    location_name: s.location_name ?? '',
    location_address: s.location_address ?? null,
    latitude: s.latitude ?? null,
    longitude: s.longitude ?? null,
    meeting_point: s.meeting_point ?? '',
    city: s.city ?? null,
    venue_id: s.venue_id ?? null,
    max_participants: s.max_participants ?? 10,
    price_per_slot: Number(s.price_per_slot ?? 0),
    organizer_plays: null,
    session_type: s.session_type ?? null,
    skill_level: s.skill_level ?? null,
  };
}

/** O que falta para seguir do passo (null = pode seguir). `now` no formato de nowSP(). */
export function stepMissing(step: StepId, v: SessionValues, now: string, opts: { editing?: boolean } = {}): string | null {
  switch (step) {
    case 'kind':
      return null;
    case 'sport':
      return v.category_id ? null : 'Escolha o esporte.';
    case 'when':
      if (!v.date) return 'Escolha o dia.';
      if (!v.start_time) return 'Escolha o horário.';
      if (!opts.editing && `${v.date}T${v.start_time.slice(0, 5)}` <= now) return 'Esse horário já passou. Escolha outro.';
      return null;
    case 'where':
      return v.location_name.trim() ? null : 'Informe o local.';
    case 'spots':
      if (!(v.max_participants >= 1)) return 'Informe quantas vagas a atividade tem.';
      return v.price_per_slot >= 0 ? null : 'O preço não pode ser negativo.';
    case 'name':
      return v.title.trim() ? null : 'Dê um nome para a atividade.';
  }
}

/** Primeiro passo com algo faltando (ou null se tudo pronto) */
export function firstMissingStep(v: SessionValues, now: string, opts: { editing?: boolean } = {}): StepId | null {
  return STEPS.find((s) => stepMissing(s, v, now, opts)) ?? null;
}

/** O que vai para o banco (sem professional_id, que a tela preenche) */
export function toSessionInsert(v: SessionValues, opts: { editing: boolean; hadSportOther: boolean }): Omit<TablesInsert<'sessions'>, 'professional_id'> {
  return {
    kind: v.kind,
    category_id: v.category_id,
    // o esporte livre só vai quando existe; na edição, se antes havia, manda NULL para limpar
    ...(v.sport_other || (opts.editing && opts.hadSportOther) ? { sport_other: v.sport_other } : {}),
    title: v.title.trim(),
    description: v.description.trim() || null,
    what_to_bring: v.what_to_bring.trim() || null,
    cover_image_url: v.cover_image_url || null,
    date: v.date,
    start_time: v.start_time,
    duration_minutes: v.duration_minutes,
    location_name: v.location_name.trim(),
    location_address: v.location_address,
    latitude: v.latitude,
    longitude: v.longitude,
    meeting_point: v.meeting_point.trim() || null,
    city: v.city,
    venue_id: v.venue_id,
    max_participants: v.max_participants,
    price_per_slot: v.price_per_slot,
    ...(v.session_type ? { session_type: v.session_type } : {}),
    skill_level: v.skill_level,
  };
}

// Rascunho da criação: guardado no aparelho, com o passo em que a pessoa parou.
const DRAFT_KEY = 'riff-session-draft';
export type SessionDraft = { values: SessionValues; step: StepId | 'review' };

export function readDraft(): SessionDraft | null {
  try {
    const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return null;
    // formato antigo (só os campos do formulário): volta para o começo
    if (!('values' in raw)) return { values: { ...emptyValues(), ...raw }, step: 'kind' };
    return { values: { ...emptyValues(), ...raw.values }, step: raw.step ?? 'kind' };
  } catch {
    return null;
  }
}

export function writeDraft(draft: SessionDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // armazenamento indisponível: segue sem rascunho
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // nada a limpar
  }
}

/** O rascunho tem algo que valha oferecer "Continuar"? */
export const draftHasContent = (d: SessionDraft | null) => !!d && (!!d.values.category_id || !!d.values.title.trim() || !!d.values.date);
