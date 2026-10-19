import { useMemo, useRef, useState } from 'react';
import { addDays, format, nextSaturday, nextSunday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarDays, Flag, GraduationCap, ImagePlus, Loader2, Lock, MapPin, Minus, Plus, Search, Sparkles, Trophy, Users, Wallet } from 'lucide-react';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';
import { SportIcon } from '@riff/core/domain';
import { PlaceSearch } from '@riff/core/domain/PlaceSearch';
import { Input } from '@riff/core/ui/input';
import { Textarea } from '@riff/core/ui/textarea';
import { KINDS, type ActivityKind } from '@riff/core/lib/copy';
import { chipClass } from '@riff/core/lib/chips';
import { cn } from '@riff/core/lib/utils';
import { formatBRL } from '@riff/core/lib/money';
import { sportExactMatch, sportMatches } from '@riff/core/lib/sportSearch';
import { uploadImage } from '@riff/core/lib/avatar';
import { suggestActivityTitle } from '@riff/core/lib/activityTitle';
import { useCategories } from '@/hooks/useCategories';
import { useMyVenues } from '@/hooks/useMyVenues';
import { DURATIONS, PRICES, QUICK_TIMES, durationLabel, organizerPlays, todaySP, type SessionValues, type StepId } from '@/lib/sessionForm';
import { Switch } from '@riff/core/ui/switch';

export type StepProps = {
  v: SessionValues;
  update: (patch: Partial<SessionValues>) => void;
};

const KIND_ICONS: Record<ActivityKind, typeof GraduationCap> = {
  class: GraduationCap,
  match: Users,
  tournament: Trophy,
  event: CalendarDays,
  other: Sparkles,
};

const Label = ({ children }: { children: React.ReactNode }) => <p className="type-label px-1">{children}</p>;
const Locked = ({ children }: { children: React.ReactNode }) => (
  <p className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-ink">
    <Lock className="w-3.5 h-3.5 text-accent shrink-0" /> {children}
  </p>
);

/** Passo 1: o que vai organizar (cartões com exemplo) */
export function KindStep({ v, update, locked }: StepProps & { locked: boolean }) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Tipo de atividade">
      {locked && <Locked>Já tem gente inscrita: o tipo não muda.</Locked>}
      {(Object.keys(KINDS) as ActivityKind[]).map((k) => {
        const Icon = KIND_ICONS[k];
        const active = v.kind === k;
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={locked && !active}
            onClick={() => update({ kind: k, duration_minutes: KINDS[k].defaultDuration })}
            className={cn(
              'w-full flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors disabled:opacity-40',
              active ? 'bg-brand/10 border-brand' : 'bg-surface border-line',
            )}
          >
            <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', active ? 'bg-brand text-brand-ink' : 'bg-elevated text-ink-muted')}>
              <Icon className="w-5 h-5" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{KINDS[k].label}</span>
              <span className="block text-xs text-ink-muted leading-relaxed mt-0.5">{KINDS[k].description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Passo 2: esporte (os já usados primeiro, busca por apelido e "não achei") */
export function SportStep({ v, update }: StepProps) {
  const { data: categories } = useCategories();
  const { profile } = useProfile();
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const { data: used } = useQuery({
    queryKey: ['sessions', 'pro', 'used-categories', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('category_id')
        .eq('professional_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(40);
      if (error) throw error;
      return [...new Set(data.map((x) => x.category_id))];
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  });
  const ordered = useMemo(() => {
    const u = used ?? [];
    const rank = (id: string) => (u.includes(id) ? u.indexOf(id) : u.length + 1);
    return [...(categories ?? [])].sort((a, b) => rank(a.id) - rank(b.id));
  }, [categories, used]);
  const outros = categories?.find((c) => c.slug === 'outros');
  const filtered = ordered.filter((c) => sportMatches(c, search));
  const visible = search || showAll ? filtered : filtered.slice(0, 12);
  const newName = search.trim().replace(/\s+/g, ' ');
  const canUseNew = newName.length >= 2 && newName.length <= 40 && !!outros && !filtered.some((c) => sportExactMatch(c, newName));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar: futevôlei, yoga, beach tennis…" aria-label="Buscar esporte" className="h-12 pl-9 bg-surface border-line" />
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
            className={cn(chipClass(v.category_id === c.id && !v.sport_other), 'flex items-center gap-1.5')}
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
          <p className="text-xs text-ink-muted">A atividade sai com esse nome. A equipe Riff avalia e pode colocar o esporte na lista oficial.</p>
        </div>
      )}
    </div>
  );
}

/** Passo 3: dia, horário e duração, um embaixo do outro */
export function WhenStep({ v, update }: StepProps) {
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
  const otherDate = !!v.date && !quickDates.some((d) => d.value === v.date);

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
        <label className="block">
          <span className="sr-only">Outro dia</span>
          <Input type="date" min={today} value={v.date} onChange={(e) => update({ date: e.target.value })} className={cn('h-12 bg-surface border-line', otherDate && 'border-brand')} />
        </label>
        {v.date && <p className="text-xs text-ink-muted px-1 first-letter:uppercase">{format(parseISO(v.date), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>}
      </section>

      <section className="space-y-2">
        <Label>Horário de início</Label>
        <div className="flex flex-wrap gap-2">
          {QUICK_TIMES.map((t) => (
            <button key={t} type="button" aria-pressed={v.start_time === t} onClick={() => update({ start_time: t })} className={chipClass(v.start_time === t)}>
              {t}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="sr-only">Outro horário</span>
          <Input type="time" value={v.start_time} onChange={(e) => update({ start_time: e.target.value })} className="h-12 bg-surface border-line" />
        </label>
      </section>

      <section className="space-y-2">
        <Label>Duração</Label>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((m) => (
            <button key={m} type="button" aria-pressed={v.duration_minutes === m} onClick={() => update({ duration_minutes: m })} className={chipClass(v.duration_minutes === m)}>
              {durationLabel(m)}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Passo 4: lugar (os já usados primeiro), busca de endereço e ponto de encontro */
export function WhereStep({ v, update }: StepProps) {
  const { data: myVenues } = useMyVenues();
  const near = useMemo(() => {
    const x = myVenues?.find((m) => m.latitude != null && m.longitude != null);
    return x ? { latitude: Number(x.latitude), longitude: Number(x.longitude) } : null;
  }, [myVenues]);

  return (
    <div className="space-y-5">
      {myVenues && myVenues.length > 0 && (
        <section className="space-y-2">
          <Label>Lugares que você já usou</Label>
          <div className="flex flex-wrap gap-2">
            {myVenues.map((venue) => (
              <button
                key={venue.id}
                type="button"
                aria-pressed={v.location_name === venue.name}
                onClick={() =>
                  update({
                    location_name: venue.name,
                    location_address: venue.address ?? null,
                    latitude: venue.latitude ?? null,
                    longitude: venue.longitude ?? null,
                    venue_id: venue.id,
                    ...(venue.city ? { city: venue.city } : {}),
                  })
                }
                className={cn(chipClass(v.location_name === venue.name), 'inline-flex items-center gap-1.5')}
              >
                <MapPin className="w-3.5 h-3.5" /> {venue.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <Label>{myVenues && myVenues.length > 0 ? 'Ou busque outro lugar' : 'Busque o lugar'}</Label>
        <PlaceSearch
          value={v.location_name}
          pinned={v.latitude != null && v.longitude != null}
          near={near}
          // escreveu outro lugar: endereço, ponto e local anteriores deixam de valer
          onTextChange={(text) => update({ location_name: text, location_address: null, latitude: null, longitude: null, venue_id: null })}
          onPick={(place) =>
            update({
              location_name: place.name,
              location_address: place.address || null,
              latitude: place.latitude,
              longitude: place.longitude,
              venue_id: null,
              ...(place.city ? { city: place.city } : {}),
            })
          }
        />
      </section>

      <section className="space-y-2">
        <Label>Ponto de encontro (opcional)</Label>
        <div className="relative">
          <Flag className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={v.meeting_point}
            onChange={(e) => update({ meeting_point: e.target.value })}
            maxLength={120}
            placeholder="Ex: perto do chafariz, quadra 3"
            className="h-12 pl-9 bg-surface border-line"
          />
        </div>
      </section>
    </div>
  );
}

/** Passo 5: vagas e preço, com o que acontece com o pagamento */
export function SpotsStep({ v, update, priceLocked, isOrganizer, askPlays = false }: StepProps & { priceLocked: boolean; isOrganizer: boolean; askPlays?: boolean }) {
  const { profile } = useProfile();
  const kind = KINDS[v.kind];
  const spots = v.max_participants;
  const setSpots = (n: number) => update({ max_participants: Math.max(1, Math.min(500, n || 1)) });

  return (
    <div className="space-y-6">
      <section className="space-y-3 bg-surface border border-line rounded-2xl p-4">
        <p className="text-sm font-semibold text-ink">{kind.capacityLabel}</p>
        {kind.capacityHint && <p className="text-xs text-ink-muted -mt-2">{kind.capacityHint}</p>}
        <div className="flex items-center justify-center gap-6">
          <button type="button" aria-label="Menos vagas" onClick={() => setSpots(spots - 1)} className="w-12 h-12 rounded-full bg-elevated border border-line flex items-center justify-center text-ink active:scale-95">
            <Minus className="w-5 h-5" />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={500}
            value={spots}
            onChange={(e) => setSpots(Number(e.target.value))}
            aria-label="Número de vagas"
            className="type-display w-20 text-center bg-transparent text-ink focus:outline-none"
          />
          <button type="button" aria-label="Mais vagas" onClick={() => setSpots(spots + 1)} className="w-12 h-12 rounded-full bg-elevated border border-line flex items-center justify-center text-ink active:scale-95">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </section>

      {askPlays && (
        <label className="flex items-center justify-between gap-3 bg-surface border border-line rounded-2xl p-4 cursor-pointer">
          <span>
            <span className="block text-sm font-semibold text-ink">Você também vai jogar?</span>
            <span className="block text-xs text-ink-muted mt-0.5">
              {organizerPlays(v) ? `Você aparece em "Quem vai" e ocupa 1 das ${spots} vagas.` : 'Você só organiza: as vagas são todas para os participantes.'}
            </span>
          </span>
          <Switch checked={organizerPlays(v)} onCheckedChange={(on) => update({ organizer_plays: on })} aria-label="Você também vai jogar?" />
        </label>
      )}

      <section className="space-y-3 bg-surface border border-line rounded-2xl p-4">
        <p className="text-sm font-semibold text-ink">Preço por vaga</p>
        {priceLocked && <Locked>Já tem gente inscrita: o preço fica como está.</Locked>}
        <div className="flex flex-wrap gap-2">
          {PRICES.map((p) => (
            <button
              key={p}
              type="button"
              disabled={priceLocked}
              aria-pressed={v.price_per_slot === p}
              onClick={() => update({ price_per_slot: p })}
              className={cn(chipClass(v.price_per_slot === p), 'disabled:opacity-40')}
            >
              {p === 0 ? 'Grátis' : formatBRL(p)}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">R$</span>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            disabled={priceLocked}
            value={v.price_per_slot || ''}
            placeholder="Outro valor"
            onChange={(e) => update({ price_per_slot: Math.max(0, Number(e.target.value) || 0) })}
            aria-label="Outro valor"
            className="h-12 pl-10 bg-elevated border-line text-lg font-bold tabular-nums disabled:opacity-50"
          />
        </div>
        {v.price_per_slot > 0 && (
          <p className="flex items-start gap-2 text-xs text-ink-muted leading-relaxed">
            <Wallet className="w-4 h-4 text-accent shrink-0" />
            {isOrganizer && profile?.pix_key
              ? 'Quem reservar paga por Pix direto na sua chave. Você confirma o pagamento no app.'
              : 'Na hora de publicar, você cadastra a chave Pix que vai receber. O dinheiro vai direto para você.'}
          </p>
        )}
      </section>
    </div>
  );
}

/** Passo 6: nome (já sugerido), foto e detalhes */
export function NameStep({ v, update, sportName }: StepProps & { sportName: string }) {
  const { profile } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const suggestion = suggestActivityTitle({ kind: v.kind, sport: sportName, date: v.date, time: v.start_time });

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      update({ cover_image_url: await uploadImage(`sessions/${profile?.id}`, file) });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a foto.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <Label>Nome da atividade</Label>
        <Input value={v.title} onChange={(e) => update({ title: e.target.value })} maxLength={80} placeholder={KINDS[v.kind].titlePlaceholder} aria-label="Nome da atividade" className="h-12 bg-surface border-line font-semibold" />
        {suggestion && v.title.trim() !== suggestion && (
          <button type="button" onClick={() => update({ title: suggestion })} className="h-9 px-3 rounded-full bg-brand/10 border border-brand/30 text-brand text-xs font-medium inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Usar "{suggestion}"
          </button>
        )}
        <p className="text-xs text-ink-muted px-1">Nomes que dizem o que a pessoa ganha atraem mais gente. Ex: "Futevôlei para iniciantes".</p>
      </section>

      <section className="space-y-2">
        <Label>Foto (opcional)</Label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative w-full h-28 rounded-2xl border border-dashed border-line bg-surface flex items-center justify-center gap-2 overflow-hidden text-sm text-ink-muted"
        >
          {v.cover_image_url ? (
            <>
              <img src={v.cover_image_url} alt="Foto da atividade" className="absolute inset-0 w-full h-full object-cover" />
              <span className="relative px-3 h-8 rounded-full bg-bg/70 text-ink text-xs font-semibold flex items-center">Trocar foto</span>
            </>
          ) : (
            <>
              <ImagePlus className="w-5 h-5" /> Adicionar foto
            </>
          )}
          {uploading && (
            <span className="absolute inset-0 bg-bg/60 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-brand animate-spin" />
            </span>
          )}
        </button>
        <input type="file" ref={fileRef} onChange={upload} accept="image/*" className="hidden" />
      </section>

      <section className="space-y-2">
        <Label>Sobre a atividade (opcional)</Label>
        <Textarea value={v.description} onChange={(e) => update({ description: e.target.value })} placeholder={KINDS[v.kind].descriptionPlaceholder} aria-label="Descrição" className="h-24 bg-surface border-line resize-none" />
      </section>

      <section className="space-y-2">
        <Label>O que levar (opcional)</Label>
        <Textarea value={v.what_to_bring} onChange={(e) => update({ what_to_bring: e.target.value })} placeholder="Um item por linha: garrafa d'água, toalha…" aria-label="O que levar" className="h-20 bg-surface border-line resize-none" />
      </section>
    </div>
  );
}

/** Revisão: a prévia do ingresso e cada resposta com "Alterar" */
export function ReviewStep({ v, sportName, sportSlug, onEdit, showPlays = false }: { v: SessionValues; sportName: string; sportSlug?: string | null; onEdit: (step: StepId) => void; showPlays?: boolean }) {
  const rows: { step: StepId; label: string; value: React.ReactNode }[] = [
    { step: 'kind', label: 'Tipo', value: KINDS[v.kind].label },
    { step: 'sport', label: 'Esporte', value: sportName || '—' },
    {
      step: 'when',
      label: 'Quando',
      value: v.date ? (
        <span className="first-letter:uppercase">
          {format(parseISO(v.date), "EEEE, d 'de' MMMM", { locale: ptBR })} às {v.start_time} · {durationLabel(v.duration_minutes)}
        </span>
      ) : (
        '—'
      ),
    },
    {
      step: 'where',
      label: 'Onde',
      value: (
        <>
          {v.location_name || '—'}
          {v.meeting_point.trim() && <span className="block text-xs text-ink-muted">Encontro: {v.meeting_point.trim()}</span>}
        </>
      ),
    },
    { step: 'spots', label: 'Vagas e preço', value: `${v.max_participants} vaga${v.max_participants === 1 ? '' : 's'}${showPlays && organizerPlays(v) ? ' (com você)' : ''} · ${v.price_per_slot > 0 ? formatBRL(v.price_per_slot) : 'Grátis'}` },
    {
      step: 'name',
      label: 'Nome e detalhes',
      value: (
        <>
          {v.title.trim() || '—'}
          {(v.description.trim() || v.cover_image_url) && (
            <span className="block text-xs text-ink-muted">{[v.cover_image_url && 'Com foto', v.description.trim() && 'Com descrição'].filter(Boolean).join(' · ')}</span>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Prévia, no formato do ingresso */}
      <div className="bg-elevated border border-line rounded-2xl shadow-[var(--shadow-2)] overflow-hidden">
        {v.cover_image_url && <img src={v.cover_image_url} alt="" className="w-full h-28 object-cover" />}
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 min-w-0">
          <SportIcon slug={v.sport_other ? 'outros' : sportSlug} className="w-5 h-5 text-brand shrink-0" />
          <p className="type-subtitle truncate flex-1">{v.title.trim() || 'Nome da atividade'}</p>
          <span className={cn('text-sm font-bold font-display shrink-0', v.price_per_slot > 0 ? 'text-accent' : 'text-success')}>
            {v.price_per_slot > 0 ? formatBRL(v.price_per_slot) : 'Grátis'}
          </span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line border-t border-dashed border-line">
          <div className="p-2.5 text-center">
            <p className="type-label">Dia</p>
            <p className="text-sm font-semibold text-ink">{v.date ? format(parseISO(v.date), 'EEEEEE, d MMM', { locale: ptBR }) : '—'}</p>
          </div>
          <div className="p-2.5 text-center">
            <p className="type-label">Horário</p>
            <p className="text-sm font-semibold text-ink">{v.start_time || '—'}</p>
          </div>
          <div className="p-2.5 text-center">
            <p className="type-label">Vagas</p>
            <p className="text-sm font-semibold text-ink">{v.max_participants}</p>
          </div>
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

      <p className="text-xs text-ink-muted leading-relaxed px-1">
        Você é o responsável pela atividade, pela segurança dos participantes e por pagamentos, cancelamentos e reembolsos, conforme o Termo do
        Organizador.
      </p>
    </div>
  );
}
