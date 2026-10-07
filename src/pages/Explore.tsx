import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CalendarDays, ChevronRight, Loader2, Search, Star, UserRound } from 'lucide-react';
import { supabase } from '@riff/core/supabase/client';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { Input } from '@riff/core/ui/input';
import { useDebounce } from '@riff/core/hooks/useDebounce';
import { Avatar, EmptyState, SportIcon, StatusPill } from '@riff/core/domain';
import { HeroHeader } from '@riff/core/layout/HeroHeader';
import { chipClass } from '@riff/core/lib/chips';
import { cn } from '@riff/core/lib/utils';
import { activityPhase, nowSP } from '@riff/core/lib/activityTime';
import { useCategories } from '@/hooks/useCategories';
import { SessionRow } from '@/components/cards/SessionRow';
import type { SessionWithJoins } from '@/types/session';

type Filter = 'all' | 'activities' | 'organizers';
const FILTERS: { value: Filter; label: string; icon?: typeof Search }[] = [
  { value: 'all', label: 'Tudo' },
  { value: 'activities', label: 'Atividades', icon: CalendarDays },
  { value: 'organizers', label: 'Organizadores', icon: UserRound },
];

// O texto vai num filtro do PostgREST: tira o que tem significado lá (vírgula, parênteses, curingas)
const clean = (text: string) => text.replace(/[,()%*\\]/g, ' ').trim();
const todaySP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

type Organizer = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  public_slug: string | null;
  city: string | null;
  rating_avg: number | null;
  total_reviews: number | null;
  specialties: unknown;
};

// Explorar: atividades (pelo nome, local ou esporte) e organizadores (pelo nome)
export default function Explore() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sport, setSport] = useState<string | null>(null);
  const debounced = clean(useDebounce(searchTerm, 400));
  const { data: categories } = useCategories();

  const wantActivities = filter !== 'organizers';
  const wantOrganizers = filter !== 'activities' && !sport;

  const activities = useQuery({
    queryKey: ['explore', 'activities', debounced, sport],
    queryFn: async () => {
      let query = supabase
        .from('sessions')
        .select(
          `id, title, description, date, start_time, duration_minutes, location_name, location_address, max_participants,
           current_participants, price_per_slot, status, session_type, skill_level, category_id, kind, city,
           professional:profiles(id, full_name, avatar_url, rating_avg, total_reviews, public_slug),
           category:categories(name, icon, emoji, slug)`,
        )
        .eq('product', 'pro')
        .in('status', ['active', 'full'])
        .gte('date', todaySP())
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(30);
      if (debounced) query = query.or(`title.ilike.%${debounced}%,location_name.ilike.%${debounced}%,city.ilike.%${debounced}%`);
      if (sport) query = query.eq('category_id', sport);
      const { data, error } = await query;
      if (error) throw error;
      // as de hoje que já começaram não aceitam mais inscrição
      const now = nowSP();
      return data.filter((s) => activityPhase(s, now) === 'open');
    },
    enabled: wantActivities,
  });

  const organizers = useQuery({
    queryKey: ['explore', 'organizers', debounced],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, public_slug, city, rating_avg, total_reviews, specialties')
        .eq('role', 'professional')
        .is('deleted_at', null);
      query = debounced ? query.ilike('full_name', `%${debounced}%`).limit(20) : query.order('rating_avg', { ascending: false }).limit(10);
      const { data, error } = await query;
      if (error) throw error;
      return data as Organizer[];
    },
    enabled: wantOrganizers,
  });

  const isLoading = (wantActivities && activities.isLoading) || (wantOrganizers && organizers.isLoading);
  const isError = (wantActivities && activities.isError) || (wantOrganizers && organizers.isError);
  const acts = wantActivities ? (activities.data ?? []) : [];
  const orgs = wantOrganizers ? (organizers.data ?? []) : [];
  const sportName = categories?.find((c) => c.id === sport)?.name;

  return (
    <PageContainer withBottomNav>
      <HeroHeader label="Explorar" title="O que você procura?" subtitle="Atividades e quem organiza: busque pelo nome, lugar ou esporte.">
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ex: Exodia, vôlei de praia, Redenção"
            aria-label="Buscar atividades e organizadores"
            className="pl-9 h-12 bg-bg/70 border-line rounded-xl"
          />
        </div>
      </HeroHeader>

      {/* Filtros pequenos: o que mostrar e esporte */}
      <div className="pt-4 space-y-2">
        <div className="flex gap-2 px-4" role="radiogroup" aria-label="Mostrar">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(chipClass(filter === f.value), 'inline-flex items-center gap-1.5')}
            >
              {f.icon && <f.icon className="w-4 h-4" />} {f.label}
            </button>
          ))}
        </div>
        {filter !== 'organizers' && categories && categories.length > 0 && (
          <div className="flex overflow-x-auto hide-scrollbar gap-2 px-4" aria-label="Esporte">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={sport === c.id}
                onClick={() => setSport(sport === c.id ? null : c.id)}
                className={cn(chipClass(sport === c.id), 'shrink-0 inline-flex items-center gap-1.5')}
              >
                <SportIcon slug={c.slug} className="w-4 h-4" /> {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="py-6 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-brand animate-spin" />
          </div>
        ) : isError ? (
          <div className="px-4">
            <EmptyState
              icon={AlertCircle}
              title="Não foi possível buscar agora"
              description="Tente de novo em instantes."
              action={{ label: 'Tentar novamente', onClick: () => window.location.reload() }}
            />
          </div>
        ) : acts.length === 0 && orgs.length === 0 ? (
          <div className="px-4">
            <EmptyState
              icon={Search}
              title={debounced ? `Nada encontrado para "${debounced}"` : 'Nada por aqui ainda'}
              description={
                sport
                  ? `Nenhuma atividade de ${sportName ?? 'esse esporte'} aberta agora. Tire o filtro de esporte para ver mais.`
                  : 'Confira a grafia ou busque pelo esporte, pelo lugar ou pelo nome de quem organiza.'
              }
            />
          </div>
        ) : (
          <>
            {acts.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-baseline justify-between px-6">
                  <h2 className="type-subtitle">{debounced || sport ? 'Atividades' : 'Próximas atividades'}</h2>
                  <span className="text-xs text-ink-muted">{acts.length}</span>
                </div>
                <div className="mx-4 bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
                  {acts.map((s) => (
                    <SessionRow key={s.id} session={s as unknown as SessionWithJoins} showDay />
                  ))}
                </div>
              </section>
            )}

            {orgs.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-baseline justify-between px-6">
                  <h2 className="type-subtitle">{debounced ? 'Organizadores' : 'Organizadores mais bem avaliados'}</h2>
                  <span className="text-xs text-ink-muted">{orgs.length}</span>
                </div>
                <ul className="mx-4 bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
                  {orgs.map((pro) => {
                    const specialties = Array.isArray(pro.specialties) ? (pro.specialties as string[]) : [];
                    return (
                      <li key={pro.id}>
                        <Link to={pro.public_slug ? `/@${pro.public_slug}` : `/pro/${pro.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-elevated">
                          <Avatar src={pro.avatar_url} name={pro.full_name} className="w-12 h-12" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-ink truncate">{pro.full_name}</p>
                            <p className="text-xs text-ink-muted truncate">
                              {[pro.city, specialties.slice(0, 2).join(', ')].filter(Boolean).join(' · ') || 'Organizador'}
                            </p>
                          </div>
                          {(pro.total_reviews ?? 0) > 0 ? (
                            <span className="flex items-center gap-1 text-sm font-semibold text-ink shrink-0">
                              <Star className="w-3.5 h-3.5 text-accent fill-accent" /> {(pro.rating_avg ?? 0).toFixed(1)}
                              <span className="text-xs text-ink-muted font-normal">({pro.total_reviews})</span>
                            </span>
                          ) : (
                            <StatusPill text="Novo" variant="info" className="shrink-0" />
                          )}
                          <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
