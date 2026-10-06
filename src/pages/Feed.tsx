import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isSameDay, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, Search } from 'lucide-react';

import { PageContainer } from '@riff/core/layout/PageContainer';
import { HeroHeader, HeroIconButton } from '@riff/core/layout/HeroHeader';
import { EmptyState, SportIcon, WeekStrip } from '@riff/core/domain';
import { useProfile } from '@riff/core/hooks/useProfile';
import { KINDS, type ActivityKind } from '@riff/core/lib/copy';
import { chipClass } from '@riff/core/lib/chips';
import { cn } from '@riff/core/lib/utils';
import { ModeSwitcher } from '@/components/layout/ModeSwitcher';
import { useSessions } from '@/hooks/useSessions';
import { useCategories } from '@/hooks/useCategories';
import { SessionRow } from '@/components/cards/SessionRow';
import { SessionCardSkeleton } from '@/components/skeletons/SessionCardSkeleton';
import type { SessionWithJoins } from '@/types/session';

// Compara cidades sem acento, caixa ou espaços ("Porto alegre" = "Porto Alegre").
const normalizeCity = (city?: string | null) =>
  (city ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

// Data de hoje no fuso de São Paulo (AAAA-MM-DD)
const todaySP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

const dayLabel = (date: string) => {
  const d = parseISO(date);
  if (isToday(d)) return 'Hoje';
  if (isTomorrow(d)) return 'Amanhã';
  return format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
};

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between px-6">
        <h2 className="type-subtitle first-letter:uppercase">{title}</h2>
        <span className="text-xs text-ink-muted">
          {count} atividade{count === 1 ? '' : 's'}
        </span>
      </div>
      {children}
    </section>
  );
}

function Rows({ items, showDay, showCity, highlight }: { items: SessionWithJoins[]; showDay?: boolean; showCity?: boolean; highlight?: boolean }) {
  return (
    <div className={highlight ? 'px-4 space-y-2' : 'mx-4 bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden'}>
      {items.map((s) => (
        <SessionRow key={s.id} session={s} showDay={showDay} showCity={showCity} highlight={highlight} />
      ))}
    </div>
  );
}

// Início do participante: o que vai rolar na cidade, organizado pela semana
export const Feed = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { feed: sessions, isLoadingFeed, isErrorFeed, errorFeed } = useSessions();
  if (isErrorFeed && errorFeed) console.error('Error fetching feed:', errorFeed);
  const { data: categories } = useCategories();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedKind, setSelectedKind] = useState<ActivityKind | 'all'>('all');
  const [day, setDay] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = (sessions ?? []) as unknown as SessionWithJoins[];
    if (selectedCategory !== 'all') result = result.filter((s) => s.category_id === selectedCategory);
    if (selectedKind !== 'all') result = result.filter((s) => s.kind === selectedKind);
    return result;
  }, [sessions, selectedCategory, selectedKind]);

  // Cidade da pessoa primeiro; as outras cidades vêm numa seção abaixo.
  const myCity = normalizeCity(profile?.city);
  const local = useMemo(() => (myCity ? filtered.filter((s) => normalizeCity(s.city) === myCity) : filtered), [filtered, myCity]);
  const otherCities = useMemo(() => (myCity ? filtered.filter((s) => normalizeCity(s.city) !== myCity) : []), [filtered, myCity]);

  const today = parseISO(todaySP());
  const weekEnd = format(new Date(today.getTime() + 6 * 86400000), 'yyyy-MM-dd');
  const onDay = (d: Date) => local.filter((s) => isSameDay(parseISO(s.date), d));
  const todayItems = onDay(today);
  const restOfWeek = local.filter((s) => !isSameDay(parseISO(s.date), today) && s.date <= weekEnd);
  const later = local.filter((s) => s.date > weekEnd);

  // "Mais adiante" agrupado por dia
  const laterGroups = later.reduce<{ label: string; items: SessionWithJoins[] }[]>((acc, s) => {
    const label = dayLabel(s.date);
    const last = acc[acc.length - 1];
    if (last?.label === label) last.items.push(s);
    else acc.push({ label, items: [s] });
    return acc;
  }, []);

  const dayItems = day ? local.filter((s) => s.date === day) : [];
  const firstName = profile?.full_name?.split(' ')[0];
  const hasFilters = selectedCategory !== 'all' || selectedKind !== 'all';
  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedKind('all');
  };

  return (
    <PageContainer withBottomNav>
      <HeroHeader
        overlap
        topLeft={<ModeSwitcher />}
        topRight={
          <HeroIconButton label="Buscar organizadores" onClick={() => navigate('/explore')}>
            <Search className="w-5 h-5" />
          </HeroIconButton>
        }
        label={
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {profile?.city || 'Sua cidade'}
          </span>
        }
        title={`Olá${firstName ? `, ${firstName}` : ''}!`}
        subtitle={todayItems.length ? 'Veja o que vai rolar hoje perto de você.' : 'Veja o que vai rolar esta semana perto de você.'}
      >
        {!isLoadingFeed && (
          <div className="flex gap-2 mt-4">
            <span className="px-3 h-7 rounded-full bg-brand text-brand-ink text-xs font-bold flex items-center">{todayItems.length} hoje</span>
            <span className="px-3 h-7 rounded-full bg-elevated border border-line text-ink text-xs font-semibold flex items-center">
              {todayItems.length + restOfWeek.length} esta semana
            </span>
          </div>
        )}
      </HeroHeader>

      <WeekStrip start={today} hasEvents={(d) => onDay(d).length > 0} selected={day} onSelect={setDay} overlap />

      {/* Filtros: tipo e esporte */}
      <div className="pt-5 space-y-2">
        <div className="flex overflow-x-auto hide-scrollbar gap-2 px-4">
          <button type="button" onClick={() => setSelectedKind('all')} className={cn(chipClass(selectedKind === 'all'), 'shrink-0')}>
            Todos os tipos
          </button>
          {(Object.keys(KINDS) as ActivityKind[]).map((k) => (
            <button key={k} type="button" onClick={() => setSelectedKind(k)} className={cn(chipClass(selectedKind === k), 'shrink-0')}>
              {KINDS[k].chip}
            </button>
          ))}
        </div>
        <div className="flex overflow-x-auto hide-scrollbar gap-2 px-4">
          <button type="button" onClick={() => setSelectedCategory('all')} className={cn(chipClass(selectedCategory === 'all'), 'shrink-0')}>
            Todos os esportes
          </button>
          {categories?.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={cn(chipClass(selectedCategory === c.id), 'shrink-0 flex items-center gap-1.5')}
            >
              <SportIcon slug={c.slug} className="w-4 h-4" /> {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="py-6 space-y-6">
        {isLoadingFeed ? (
          <div className="px-4 space-y-4">
            <SessionCardSkeleton />
            <SessionCardSkeleton />
          </div>
        ) : day ? (
          dayItems.length ? (
            <Section title={dayLabel(day)} count={dayItems.length}>
              <Rows items={dayItems} />
            </Section>
          ) : (
            <div className="px-4">
              <EmptyState icon={Search} title={`Nada marcado para ${dayLabel(day).toLowerCase()}`} description="Escolha outro dia ou veja a semana inteira." />
            </div>
          )
        ) : local.length === 0 && otherCities.length === 0 ? (
          <div className="px-4">
            <EmptyState
              icon={Search}
              title="Nenhuma atividade encontrada"
              description={hasFilters ? 'Não achamos nada com esses filtros por agora.' : 'Ainda não há atividades publicadas na sua região.'}
              action={hasFilters ? { label: 'Limpar filtros', onClick: clearFilters } : { label: 'Buscar organizadores', onClick: () => navigate('/explore') }}
            />
          </div>
        ) : (
          <>
            {local.length === 0 && myCity && (
              <p className="px-6 text-sm text-ink-muted">Ainda não há atividades em {profile?.city}. Veja o que está rolando em outras cidades.</p>
            )}
            {todayItems.length > 0 && (
              <Section title="Hoje" count={todayItems.length}>
                <Rows items={todayItems} highlight />
              </Section>
            )}
            {restOfWeek.length > 0 && (
              <Section title="Esta semana" count={restOfWeek.length}>
                <Rows items={restOfWeek} showDay />
              </Section>
            )}
            {laterGroups.map((g) => (
              <Section key={g.label} title={g.label} count={g.items.length}>
                <Rows items={g.items} />
              </Section>
            ))}
            {otherCities.length > 0 && (
              <Section title="Em outras cidades" count={otherCities.length}>
                <Rows items={otherCities} showDay showCity />
              </Section>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
};
export default Feed;
