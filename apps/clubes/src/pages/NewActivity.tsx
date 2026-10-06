import { useMemo, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, nextSaturday, nextSunday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, BookOpen, CalendarDays, MapPin, Minus, Plus, Search, Sparkles, Trophy, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { BrandLines } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
import { Textarea } from '@riff/core/ui/textarea';
import { Switch } from '@riff/core/ui/switch';
import { KINDS, type ActivityKind } from '@riff/core/lib/copy';
import { cn, errorMessage } from '@riff/core/lib/utils';
import { useCommunity, todaySP } from '@/hooks/useCommunity';
import { SportIcon } from '@/components/SportIcon';

const FIELD = 'h-12 bg-surface border-line';
const KIND_ICONS: Record<ActivityKind, typeof BookOpen> = {
  class: BookOpen,
  match: Users,
  tournament: Trophy,
  event: CalendarDays,
  other: Sparkles,
};
const TIMES = ['07:00', '08:00', '09:00', '18:00', '19:00', '20:00'];
const DURATIONS = [30, 45, 60, 90, 120];
const durationLabel = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60}h`);

const chip = (active: boolean) =>
  cn(
    'h-9 px-3 rounded-full text-sm font-medium border transition-colors',
    active ? 'bg-brand text-brand-ink border-brand' : 'bg-surface border-line text-ink-muted',
  );

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-line rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="w-6 h-6 rounded-full bg-brand text-brand-ink text-xs font-bold flex items-center justify-center shrink-0">{n}</span>
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {hint && <p className="text-xs text-ink-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

// Novo evento: perguntas em blocos, prévia ao vivo e publicação para os membros
export default function NewActivity() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { data: community, isLoading } = useCommunity(orgId);

  const { data: categories } = useQuery({
    queryKey: ['categories', 'with-slug'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });

  // Locais já usados pela comunidade (quadra, piscina, salão…)
  const { data: venues } = useQuery({
    queryKey: ['community-venues', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('venues').select('id, name').eq('organization_id', orgId!).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // escolha da pessoa; antes disso, instrutor começa em Aula e morador em Jogo
  const [kindChoice, setKindChoice] = useState<ActivityKind | null>(null);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sportSearch, setSportSearch] = useState('');
  const [showAllSports, setShowAllSports] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationChoice, setDurationChoice] = useState<number | null>(null);
  const [place, setPlace] = useState('');
  const [spots, setSpots] = useState(10);
  const [description, setDescription] = useState('');
  const [minorsAllowed, setMinorsAllowed] = useState(false);
  const [minAge, setMinAge] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const kind: ActivityKind = kindChoice ?? (community?.role === 'instructor' ? 'class' : 'match');
  const duration = durationChoice ?? KINDS[kind].defaultDuration;

  const today = parseISO(todaySP());
  const quickDates = useMemo(() => {
    const list = [
      { label: 'Hoje', value: format(today, 'yyyy-MM-dd') },
      { label: 'Amanhã', value: format(addDays(today, 1), 'yyyy-MM-dd') },
      { label: 'Sábado', value: format(nextSaturday(today), 'yyyy-MM-dd') },
      { label: 'Domingo', value: format(nextSunday(today), 'yyyy-MM-dd') },
    ];
    return list.filter((d, i) => list.findIndex((x) => x.value === d.value) === i);
  }, [today]);

  const category = categories?.find((c) => c.id === categoryId);
  const filteredSports = (categories ?? []).filter((c) =>
    c.name.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').includes(sportSearch.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')),
  );
  const visibleSports = sportSearch || showAllSports ? filteredSports : filteredSports.slice(0, 9);

  if (!isLoading && community === null) return <Navigate to="/inicio" replace />;

  const missing = !title.trim()
    ? 'Dê um nome para o evento.'
    : !categoryId
      ? 'Escolha o esporte.'
      : !date
        ? 'Escolha o dia.'
        : !time
          ? 'Escolha o horário.'
          : !place.trim()
            ? 'Informe o local.'
            : !(spots >= 1)
              ? 'Informe quantas vagas o evento tem.'
              : minorsAllowed && minAge !== '' && !(Number(minAge) >= 0 && Number(minAge) <= 17)
                ? 'A idade mínima vai de 0 a 17 anos.'
                : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (missing) {
      toast.error(missing);
      return;
    }
    if (!profile?.id || !orgId) return;
    setIsSaving(true);
    try {
      // product = 'clubes' e preço zero são definidos pelo banco (evento de condomínio ou clube)
      const { data: created, error } = await supabase
        .from('sessions')
        .insert({
          professional_id: profile.id,
          organization_id: orgId,
          category_id: categoryId,
          kind,
          title: title.trim(),
          description: description.trim() || null,
          date,
          start_time: time,
          duration_minutes: duration || KINDS[kind].defaultDuration,
          location_name: place.trim(),
          max_participants: spots,
          price_per_slot: 0,
          status: 'active',
          minors_allowed: minorsAllowed,
          min_age: minorsAllowed && minAge !== '' ? Number(minAge) : null,
        })
        .select('id')
        .single();
      if (error) throw error;
      toast.success('Evento publicado para a comunidade!');
      queryClient.invalidateQueries({ queryKey: ['community-agenda'] });
      queryClient.invalidateQueries({ queryKey: ['community-venues', orgId] });
      navigate(`/atividade/${created.id}`, { replace: true });
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Não foi possível publicar o evento.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageContainer withBottomNav={false}>
      <form onSubmit={handleSave}>
        {/* Cabeçalho de destaque */}
        <section className="relative overflow-hidden bg-surface border-b border-line pb-16">
          <BrandLines className="absolute inset-y-0 right-0 h-full w-3/4" />
          <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
          <div className="relative px-6 pt-safe">
            <div className="h-16 flex items-center">
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Voltar"
                className="w-10 h-10 -ml-2 rounded-full bg-bg/50 backdrop-blur-sm flex items-center justify-center text-ink active:scale-95"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            <p className="type-label">Novo evento</p>
            <h1 className="type-display mt-1">Chame os vizinhos</h1>
            <p className="text-sm text-ink-muted mt-1">{community ? `Para os membros de ${community.name}` : ''}</p>
          </div>
        </section>

        {/* Prévia ao vivo, no formato do ingresso */}
        <div className="relative z-10 -mt-10 mx-4 bg-elevated border border-line rounded-2xl shadow-[var(--shadow-2)] overflow-hidden" aria-live="polite">
          <div className="px-4 pt-3 pb-2 flex items-center gap-2 min-w-0">
            <SportIcon slug={category?.slug} className="w-5 h-5 text-brand shrink-0" />
            <p className={cn('type-subtitle truncate', !title.trim() && 'text-ink-muted')}>{title.trim() || 'Nome do evento'}</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-line border-t border-dashed border-line">
            <div className="p-2.5 text-center">
              <p className="type-label">Dia</p>
              <p className="text-sm font-semibold text-ink first-letter:uppercase">
                {date ? format(parseISO(date), 'EEEEEE, d MMM', { locale: ptBR }) : '—'}
              </p>
            </div>
            <div className="p-2.5 text-center">
              <p className="type-label">Horário</p>
              <p className="text-sm font-semibold text-ink">{time ? `${time} · ${durationLabel(duration)}` : '—'}</p>
            </div>
            <div className="p-2.5 text-center">
              <p className="type-label">Vagas</p>
              <p className="text-sm font-semibold text-ink">{spots}</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 space-y-4 pb-36">
          <Step n={1} title="O que você vai organizar?">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(KINDS) as ActivityKind[]).map((k) => {
                const Icon = KIND_ICONS[k];
                const active = kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setKindChoice(k);
                      setDurationChoice(null);
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-semibold transition-colors',
                      active ? 'bg-brand text-brand-ink border-brand' : 'bg-elevated border-line text-ink-muted',
                    )}
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                    {KINDS[k].chip}
                  </button>
                );
              })}
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={KINDS[kind].titlePlaceholder}
              maxLength={80}
              aria-label="Nome do evento"
              className={FIELD}
            />
          </Step>

          <Step n={2} title="Qual esporte?">
            <div className="relative">
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={sportSearch}
                onChange={(e) => setSportSearch(e.target.value)}
                placeholder="Buscar esporte"
                aria-label="Buscar esporte"
                className={cn(FIELD, 'pl-9')}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleSports.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={categoryId === c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={cn(chip(categoryId === c.id), 'flex items-center gap-1.5')}
                >
                  <SportIcon slug={c.slug} className="w-4 h-4" /> {c.name}
                </button>
              ))}
              {!sportSearch && !showAllSports && filteredSports.length > 9 && (
                <button type="button" onClick={() => setShowAllSports(true)} className="h-9 px-3 text-sm font-semibold text-brand">
                  Ver todos ({filteredSports.length})
                </button>
              )}
              {sportSearch && filteredSports.length === 0 && <p className="text-xs text-ink-muted">Nenhum esporte com esse nome. Tente "Outros".</p>}
            </div>
          </Step>

          <Step n={3} title="Quando?">
            <div className="flex flex-wrap gap-2">
              {quickDates.map((d) => (
                <button key={d.value} type="button" aria-pressed={date === d.value} onClick={() => setDate(d.value)} className={chip(date === d.value)}>
                  {d.label}
                </button>
              ))}
            </div>
            <Input
              type="date"
              min={todaySP()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Outra data"
              className={FIELD}
            />
            <p className="text-xs text-ink-muted pt-1">Horário</p>
            <div className="flex flex-wrap gap-2">
              {TIMES.map((t) => (
                <button key={t} type="button" aria-pressed={time === t} onClick={() => setTime(t)} className={chip(time === t)}>
                  {t}
                </button>
              ))}
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                aria-label="Outro horário"
                className="h-9 w-28 bg-surface border-line"
              />
            </div>
            <p className="text-xs text-ink-muted pt-1">Duração</p>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((m) => (
                <button key={m} type="button" aria-pressed={duration === m} onClick={() => setDurationChoice(m)} className={chip(duration === m)}>
                  {durationLabel(m)}
                </button>
              ))}
            </div>
          </Step>

          <Step n={4} title="Onde?" hint="Um lugar dentro do condomínio ou clube">
            <div className="relative">
              <MapPin className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Ex: Quadra poliesportiva"
                aria-label="Local"
                className={cn(FIELD, 'pl-9')}
              />
            </div>
            {venues && venues.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {venues.map((v) => (
                  <button key={v.id} type="button" aria-pressed={place === v.name} onClick={() => setPlace(v.name)} className={chip(place === v.name)}>
                    {v.name}
                  </button>
                ))}
              </div>
            )}
          </Step>

          <Step n={5} title={KINDS[kind].capacityLabel}>
            <div className="flex items-center justify-center gap-6">
              <button
                type="button"
                aria-label="Menos vagas"
                onClick={() => setSpots((s) => Math.max(1, s - 1))}
                className="w-11 h-11 rounded-full bg-elevated border border-line flex items-center justify-center text-ink active:scale-95"
              >
                <Minus className="w-5 h-5" />
              </button>
              <input
                type="number"
                min={1}
                max={500}
                value={spots}
                onChange={(e) => setSpots(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                aria-label="Número de vagas"
                className="type-display w-20 text-center bg-transparent text-ink focus:outline-none"
              />
              <button
                type="button"
                aria-label="Mais vagas"
                onClick={() => setSpots((s) => Math.min(500, s + 1))}
                className="w-11 h-11 rounded-full bg-elevated border border-line flex items-center justify-center text-ink active:scale-95"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </Step>

          <Step n={6} title="Detalhes" hint="Opcional">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={KINDS[kind].descriptionPlaceholder}
              aria-label="Descrição"
              className="h-24 bg-elevated border-line resize-none"
            />
            <label className="flex items-center justify-between gap-3 cursor-pointer pt-1">
              <span>
                <span className="block text-sm font-medium text-ink">Aceita menores de idade</span>
                <span className="block text-xs text-ink-muted">Entram como dependentes, inscritos pelo responsável.</span>
              </span>
              <Switch checked={minorsAllowed} onCheckedChange={setMinorsAllowed} />
            </label>
            {minorsAllowed && (
              <label className="block space-y-2">
                <span className="text-xs text-ink-muted">Idade mínima (opcional)</span>
                <Input type="number" min={0} max={17} value={minAge} onChange={(e) => setMinAge(e.target.value)} placeholder="Ex: 8" className={FIELD} />
              </label>
            )}
          </Step>

          <p className="text-xs text-ink-muted text-center">Só os membros da comunidade veem e se inscrevem. A inscrição é gratuita.</p>
        </div>

        {/* Publicar, sempre à mão */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-bg/95 backdrop-blur-xl border-t border-line px-6 py-4 pb-safe space-y-1">
          <Button type="submit" size="lg" className="w-full" disabled={isSaving}>
            {isSaving ? 'Publicando…' : 'Publicar evento'}
          </Button>
          <p className="text-xs text-center text-ink-muted min-h-4">{missing ?? 'Tudo certo. Os membros vão ver na agenda.'}</p>
        </div>
      </form>
    </PageContainer>
  );
}
