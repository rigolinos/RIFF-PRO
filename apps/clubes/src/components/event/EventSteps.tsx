import { useMemo, useState } from 'react';
import { addDays, format, nextSaturday, nextSunday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Baby, BookOpen, CalendarDays, Info, MapPin, Minus, Plus, Search, ShieldCheck, Sparkles, Trophy, Users } from 'lucide-react';
import { Input } from '@riff/core/ui/input';
import { Textarea } from '@riff/core/ui/textarea';
import { SportIcon } from '@riff/core/domain/SportIcon';
import { KINDS, type ActivityKind } from '@riff/core/lib/copy';
import { chipClass } from '@riff/core/lib/chips';
import { cn } from '@riff/core/lib/utils';
import { sportExactMatch, sportMatches } from '@riff/core/lib/sportSearch';
import { suggestActivityTitle } from '@riff/core/lib/activityTitle';
import { todaySP } from '@/hooks/useCommunity';
import { spaceKind } from '@/lib/spaces';
import { DURATIONS, QUICK_TIMES, durationLabel, type EventStep, type EventValues } from '@/lib/eventForm';

export type EventStepProps = { v: EventValues; update: (patch: Partial<EventValues>) => void };
type Category = { id: string; name: string; slug: string | null };
type Space = { id: string; name: string; space_kind: string | null; rules: string | null };
type Conflict = { session_id: string; title: string; start_time: string; end_time: string };

const KIND_ICONS: Record<ActivityKind, typeof BookOpen> = { class: BookOpen, match: Users, tournament: Trophy, event: CalendarDays, other: Sparkles };
const Label = ({ children }: { children: React.ReactNode }) => <p className="type-label px-1">{children}</p>;

/** Passo 1: esporte, com o tipo já escolhido (Jogo para morador, Aula para instrutor) e fácil de trocar */
export function EventSportStep({ v, update, categories }: EventStepProps & { categories: Category[] }) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const filtered = categories.filter((c) => sportMatches(c, search));
  const visible = search || showAll ? filtered : filtered.slice(0, 12);
  const outros = categories.find((c) => c.slug === 'outros');
  const newName = search.trim().replace(/\s+/g, ' ');
  const canUseNew = newName.length >= 2 && newName.length <= 40 && !!outros && !filtered.some((c) => sportExactMatch(c, newName));

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <Label>Tipo</Label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de evento">
          {(Object.keys(KINDS) as ActivityKind[]).map((k) => {
            const Icon = KIND_ICONS[k];
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={v.kind === k}
                onClick={() => update({ kind: k, duration: KINDS[k].defaultDuration })}
                className={cn(chipClass(v.kind === k), 'inline-flex items-center gap-1.5')}
              >
                <Icon className="w-4 h-4" strokeWidth={1.75} /> {KINDS[k].chip}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-ink-muted px-1">{KINDS[v.kind].description}</p>
      </section>

      <section className="space-y-2">
        <Label>Esporte</Label>
        <div className="relative">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar: futsal, vôlei, beach tennis…" aria-label="Buscar esporte" className="h-12 pl-9 bg-surface border-line" />
        </div>
        {v.sport_other && (
          <p className="flex items-center gap-2 rounded-xl border border-brand/50 bg-brand/10 px-3 py-2 text-sm text-ink">
            <SportIcon slug="outros" className="w-4 h-4 text-brand" /> Esporte: <span className="font-semibold">{v.sport_other}</span>
            <span className="text-xs text-ink-muted">(novo)</span>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {visible.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={v.category_id === c.id && !v.sport_other}
              onClick={() => update({ category_id: c.id, sport_other: null })}
              className={cn(chipClass(v.category_id === c.id && !v.sport_other), 'inline-flex items-center gap-1.5')}
            >
              <SportIcon slug={c.slug} className="w-4 h-4" /> {c.name}
            </button>
          ))}
          {!search && !showAll && filtered.length > 12 && (
            <button type="button" onClick={() => setShowAll(true)} className="h-9 px-3 text-sm font-semibold text-brand">
              Ver todos ({filtered.length})
            </button>
          )}
        </div>
        {canUseNew && (
          <div className="rounded-xl border border-dashed border-brand/60 p-3 space-y-1.5">
            <p className="text-xs text-ink-muted">{filtered.length === 0 ? 'Não achamos esse esporte na lista.' : 'Não é nenhum desses?'}</p>
            <button
              type="button"
              onClick={() => {
                update({ category_id: outros!.id, sport_other: newName.charAt(0).toUpperCase() + newName.slice(1) });
                setSearch('');
              }}
              className="w-full h-11 rounded-lg bg-brand/15 text-brand text-sm font-semibold"
            >
              Usar "{newName}" como esporte
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

/** Passo 2: dia, horário e duração */
export function EventWhenStep({ v, update }: EventStepProps) {
  const [today] = useState(todaySP);
  const quickDates = useMemo(() => {
    const t = parseISO(today);
    const list = [
      { label: 'Hoje', value: today },
      { label: 'Amanhã', value: format(addDays(t, 1), 'yyyy-MM-dd') },
      { label: 'Sábado', value: format(nextSaturday(t), 'yyyy-MM-dd') },
      { label: 'Domingo', value: format(nextSunday(t), 'yyyy-MM-dd') },
    ];
    return list.filter((d, i) => list.findIndex((x) => x.value === d.value) === i);
  }, [today]);

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <Label>Dia</Label>
        <div className="flex flex-wrap gap-2">
          {quickDates.map((d) => (
            <button key={d.value} type="button" aria-pressed={v.date === d.value} onClick={() => update({ date: d.value })} className={chipClass(v.date === d.value)}>
              {d.label}
            </button>
          ))}
        </div>
        <Input type="date" min={today} value={v.date} onChange={(e) => update({ date: e.target.value })} aria-label="Outro dia" className="h-12 bg-surface border-line" />
        {v.date && <p className="text-xs text-ink-muted px-1 first-letter:uppercase">{format(parseISO(v.date), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>}
      </section>
      <section className="space-y-2">
        <Label>Horário de início</Label>
        <div className="flex flex-wrap gap-2">
          {QUICK_TIMES.map((t) => (
            <button key={t} type="button" aria-pressed={v.time === t} onClick={() => update({ time: t })} className={chipClass(v.time === t)}>
              {t}
            </button>
          ))}
        </div>
        <Input type="time" value={v.time} onChange={(e) => update({ time: e.target.value })} aria-label="Outro horário" className="h-12 bg-surface border-line" />
      </section>
      <section className="space-y-2">
        <Label>Duração</Label>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((m) => (
            <button key={m} type="button" aria-pressed={v.duration === m} onClick={() => update({ duration: m })} className={chipClass(v.duration === m)}>
              {durationLabel(m)}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Passo 3: os espaços da comunidade primeiro; conflito de horário avisado aqui mesmo */
export function EventWhereStep({
  v,
  update,
  spaces,
  usedPlaces,
  conflicts,
}: EventStepProps & { spaces: Space[]; usedPlaces: { id: string; name: string }[]; conflicts: Conflict[] }) {
  const space = spaces.find((s) => s.id === v.space_id) ?? null;
  const other = !v.space_id;
  return (
    <div className="space-y-5">
      {spaces.length > 0 && (
        <section className="space-y-2">
          <Label>Espaços do grupo</Label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Espaços">
            {spaces.map((sp) => {
              const k = spaceKind(sp.space_kind);
              return (
                <button
                  key={sp.id}
                  type="button"
                  role="radio"
                  aria-checked={v.space_id === sp.id}
                  onClick={() => update({ space_id: sp.id, place: sp.name })}
                  className={cn(chipClass(v.space_id === sp.id), 'inline-flex items-center gap-1.5')}
                >
                  <k.icon className="w-4 h-4" /> {sp.name}
                </button>
              );
            })}
          </div>
        </section>
      )}
      <section className="space-y-2">
        <Label>{spaces.length > 0 ? 'Ou outro lugar' : 'Lugar'}</Label>
        <div className="relative">
          <MapPin className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={other ? v.place : ''}
            onChange={(e) => update({ place: e.target.value, space_id: null })}
            placeholder="Ex: Quadra poliesportiva"
            aria-label="Outro lugar"
            className="h-12 pl-9 bg-surface border-line"
          />
        </div>
        {usedPlaces.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {usedPlaces.map((p) => (
              <button key={p.id} type="button" aria-pressed={other && v.place === p.name} onClick={() => update({ place: p.name, space_id: null })} className={chipClass(other && v.place === p.name)}>
                {p.name}
              </button>
            ))}
          </div>
        )}
      </section>
      {space?.rules && (
        <p className="flex items-start gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink-muted">
          <Info className="w-4 h-4 text-brand shrink-0" /> {space.rules}
        </p>
      )}
      {conflicts.length > 0 && (
        <div className="rounded-xl border border-accent/50 bg-accent/10 px-3 py-2 space-y-1" role="alert">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0" /> {space?.name} já tem algo nesse horário
          </p>
          {conflicts.map((c) => (
            <p key={c.session_id} className="text-xs text-ink-muted pl-6">
              {c.title}: {c.start_time.slice(0, 5)} às {c.end_time.slice(0, 5)}
            </p>
          ))}
          <p className="text-xs text-ink-muted pl-6">Dá para publicar mesmo assim, ou voltar e trocar o horário.</p>
        </div>
      )}
    </div>
  );
}

/** Passo 4: vagas e, como pergunta própria, se crianças e adolescentes podem participar */
export function EventSpotsStep({ v, update }: EventStepProps) {
  const setSpots = (n: number) => update({ spots: Math.max(1, Math.min(500, n || 1)) });
  return (
    <div className="space-y-5">
      <section className="space-y-3 bg-surface border border-line rounded-2xl p-4">
        <p className="text-sm font-semibold text-ink">{KINDS[v.kind].capacityLabel}</p>
        <div className="flex items-center justify-center gap-6">
          <button type="button" aria-label="Menos vagas" onClick={() => setSpots(v.spots - 1)} className="w-12 h-12 rounded-full bg-elevated border border-line flex items-center justify-center text-ink active:scale-95">
            <Minus className="w-5 h-5" />
          </button>
          <input type="number" inputMode="numeric" min={1} max={500} value={v.spots} onChange={(e) => setSpots(Number(e.target.value))} aria-label="Número de vagas" className="type-display w-20 text-center bg-transparent text-ink focus:outline-none" />
          <button type="button" aria-label="Mais vagas" onClick={() => setSpots(v.spots + 1)} className="w-12 h-12 rounded-full bg-elevated border border-line flex items-center justify-center text-ink active:scale-95">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-ink px-1">Crianças e adolescentes podem participar?</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Menores de idade">
          {[
            { value: false, label: 'Não, só adultos', icon: ShieldCheck },
            { value: true, label: 'Sim, como dependentes', icon: Baby },
          ].map((o) => (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={v.minors_allowed === o.value}
              onClick={() => update({ minors_allowed: o.value })}
              className={cn('rounded-2xl border p-3 text-left text-sm font-semibold flex flex-col gap-2', v.minors_allowed === o.value ? 'bg-brand/10 border-brand text-ink' : 'bg-surface border-line text-ink-muted')}
            >
              <o.icon className="w-5 h-5" /> {o.label}
            </button>
          ))}
        </div>
        {v.minors_allowed && (
          <div className="bg-surface border border-line rounded-2xl p-4 space-y-2">
            <p className="text-xs text-ink-muted">Menores entram inscritos pelo responsável, que aceitou o Termo do Responsável. O Riff recomenda o acompanhamento de um adulto.</p>
            <label className="block space-y-1.5">
              <span className="type-label">Idade mínima (opcional)</span>
              <Input type="number" inputMode="numeric" min={0} max={17} value={v.min_age} onChange={(e) => update({ min_age: e.target.value })} placeholder="Ex: 8" className="h-12 bg-elevated border-line" />
            </label>
          </div>
        )}
      </section>
    </div>
  );
}

/** Passo 5: nome (já sugerido) e detalhes */
export function EventNameStep({ v, update, sportName }: EventStepProps & { sportName: string }) {
  const suggestion = suggestActivityTitle({ kind: v.kind, sport: sportName, date: v.date, time: v.time });
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <Label>Nome do evento</Label>
        <Input value={v.title} onChange={(e) => update({ title: e.target.value })} maxLength={80} placeholder={KINDS[v.kind].titlePlaceholder} aria-label="Nome do evento" className="h-12 bg-surface border-line font-semibold" />
        {suggestion && v.title.trim() !== suggestion && (
          <button type="button" onClick={() => update({ title: suggestion })} className="h-9 px-3 rounded-full bg-brand/10 border border-brand/30 text-brand text-xs font-medium inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Usar "{suggestion}"
          </button>
        )}
      </section>
      <section className="space-y-2">
        <Label>Detalhes (opcional)</Label>
        <Textarea value={v.description} onChange={(e) => update({ description: e.target.value })} placeholder={KINDS[v.kind].descriptionPlaceholder} aria-label="Detalhes" className="h-28 bg-surface border-line resize-none" />
      </section>
    </div>
  );
}

/** Revisão do evento com "Alterar" em cada resposta */
export function EventReview({ v, sportName, sportSlug, community, onEdit }: { v: EventValues; sportName: string; sportSlug?: string | null; community: string; onEdit: (s: EventStep) => void }) {
  const rows: { step: EventStep; label: string; value: React.ReactNode }[] = [
    { step: 'sport', label: 'Tipo e esporte', value: `${KINDS[v.kind].chip} · ${sportName || '—'}` },
    {
      step: 'when',
      label: 'Quando',
      value: v.date ? <span className="first-letter:uppercase">{format(parseISO(v.date), "EEEE, d 'de' MMMM", { locale: ptBR })} às {v.time} · {durationLabel(v.duration)}</span> : '—',
    },
    { step: 'where', label: 'Onde', value: v.place || '—' },
    {
      step: 'spots',
      label: 'Vagas e menores',
      value: `${v.spots} vaga${v.spots === 1 ? '' : 's'} · ${v.minors_allowed ? `aceita menores${v.min_age ? ` a partir de ${v.min_age} anos` : ''}` : 'só adultos'}`,
    },
    { step: 'name', label: 'Nome', value: v.title.trim() || '—' },
  ];
  return (
    <div className="space-y-4">
      <div className="bg-elevated border border-line rounded-2xl p-4 flex items-center gap-3">
        <SportIcon slug={v.sport_other ? 'outros' : sportSlug} className="w-6 h-6 text-brand shrink-0" />
        <div className="min-w-0">
          <p className="type-subtitle truncate">{v.title.trim() || 'Nome do evento'}</p>
          <p className="text-xs text-ink-muted">Só os membros de {community} veem e se inscrevem. Inscrição gratuita.</p>
        </div>
      </div>
      <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
        {rows.map((r) => (
          <li key={r.step} className="flex items-start gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="type-label">{r.label}</p>
              <div className="text-sm text-ink mt-0.5">{r.value}</div>
            </div>
            <button type="button" onClick={() => onEdit(r.step)} className="h-9 px-3 -mr-2 text-sm font-semibold text-brand shrink-0" aria-label={`Alterar ${r.label.toLowerCase()}`}>
              Alterar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
