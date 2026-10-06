import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addDays, format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Baby, Building2, CalendarPlus, ChevronDown, ClipboardCheck, KeyRound, Plus, Trophy, UserPlus, Users } from 'lucide-react';
import { useProfile } from '@riff/core/hooks/useProfile';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { Avatar, BrandLines } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@riff/core/ui/dropdown-menu';
import { cn } from '@riff/core/lib/utils';
import { useMyCommunities, useUpcomingActivities, type Activity } from '@/hooks/useActivities';
import { usePendingClose } from '@/hooks/useManagement';
import { todaySP } from '@/hooks/useCommunity';
import { ActivityRow } from '@/components/ActivityRow';
import { JoinWithCode } from '@/components/JoinWithCode';
import { ReviewPrompt } from '@/components/ReviewPrompt';
import { useRanking } from '@/hooks/useSports';

const Spinner = () => (
  <div className="flex justify-center py-12">
    <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
  </div>
);

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between px-6">
        <h2 className="type-subtitle first-letter:uppercase">{title}</h2>
        <span className="text-xs text-ink-muted">
          {count} evento{count === 1 ? '' : 's'}
        </span>
      </div>
      {children}
    </section>
  );
}

function Shortcut({ to, icon: Icon, label }: { to: string; icon: typeof Plus; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1 h-8 px-2.5 rounded-full bg-surface border border-line text-xs font-medium text-ink"
    >
      <Icon className="w-3.5 h-3.5 text-brand" /> {label}
    </Link>
  );
}

function EmptyWeek({ title, onCreate }: { title: string; onCreate: () => void }) {
  return (
    <div className="mx-4 rounded-2xl border border-dashed border-line px-5 py-6 text-center space-y-3">
      <p className="type-subtitle first-letter:uppercase">{title}</p>
      <p className="text-sm text-ink-muted">Que tal um jogo no sábado? Crie e chame os vizinhos.</p>
      <Button size="sm" onClick={onCreate}>
        <Plus className="w-4 h-4 mr-1.5" /> Criar evento
      </Button>
    </div>
  );
}

// Eventos: o que vai rolar nas comunidades da pessoa, organizado pela semana
export default function Home() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { data: communities, isLoading: isLoadingCommunities } = useMyCommunities();
  const [communityId, setCommunityId] = useState<string>('all');
  const [day, setDay] = useState<string | null>(null);

  const selected = communities?.find((c) => c.id === communityId) ?? (communities?.length === 1 ? communities[0] : undefined);
  const orgIds = useMemo(
    () => (communityId === 'all' ? communities?.map((c) => c.id) : [communityId]),
    [communities, communityId],
  );
  const { data: activities, isLoading } = useUpcomingActivities(orgIds);
  const { data: pendingClose } = usePendingClose(selected?.isAdmin ? selected.id : undefined, true);
  const { data: ranking } = useRanking(selected?.id);
  const myRank = ranking?.find((r) => r.is_me && r.points > 0);

  const today = parseISO(todaySP());
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const weekEnd = format(week[6], 'yyyy-MM-dd');
  const all = activities ?? [];
  const onDay = (d: Date) => all.filter((a) => isSameDay(parseISO(a.date), d));
  const todayItems = onDay(today);
  const restOfWeek = all.filter((a) => !isSameDay(parseISO(a.date), today) && a.date <= weekEnd);
  const later = all.filter((a) => a.date > weekEnd);
  const multi = (communities?.length ?? 0) > 1 && communityId === 'all';

  const firstName = profile?.full_name?.split(' ')[0];
  const kinds = new Set(communities?.map((c) => c.kind));
  const place = selected
    ? selected.kind === 'condo'
      ? 'condomínio'
      : 'clube'
    : kinds.size === 1
      ? kinds.has('condo')
        ? 'condomínio'
        : 'clube'
      : 'condomínio ou clube';

  const rows = (items: Activity[], opts: { showDay?: boolean; highlight?: boolean } = {}) => (
    <div
      className={cn(
        opts.highlight ? 'px-4 space-y-2' : 'mx-4 bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden',
      )}
    >
      {items.map((a) => (
        <ActivityRow key={a.id} activity={a} showDay={opts.showDay} highlight={opts.highlight} showCommunity={multi} />
      ))}
    </div>
  );

  const noCommunity = !isLoadingCommunities && (!communities || communities.length === 0);
  const dayItems = day ? all.filter((a) => a.date === day) : [];
  const dayLabel = day ? format(parseISO(day), "EEEE, d 'de' MMMM", { locale: ptBR }) : '';

  return (
    <PageContainer>
      {/* Cabeçalho de destaque: arte da marca, comunidade, saudação e resumo */}
      <section className="relative overflow-hidden bg-surface border-b border-line pb-12">
        <BrandLines className="absolute inset-y-0 right-0 h-full w-3/4" />
        <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
        <div className="relative px-6 pt-safe">
          <div className="h-16 flex items-center justify-between gap-3">
          {communities && communities.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 min-w-0 text-left">
                <div className="w-9 h-9 rounded-xl bg-elevated border border-line flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-brand" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-ink-muted">Mostrando</p>
                  <p className="text-sm font-semibold text-ink truncate flex items-center gap-1">
                    {selected?.name ?? 'Todas as comunidades'} <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  </p>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-elevated border-line">
                <DropdownMenuItem onSelect={() => setCommunityId('all')}>Todas as comunidades</DropdownMenuItem>
                {communities.map((c) => (
                  <DropdownMenuItem key={c.id} onSelect={() => setCommunityId(c.id)}>
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : selected ? (
            <Link to={`/c/${selected.id}`} className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-elevated border border-line flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-brand" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-ink-muted">{selected.kind === 'condo' ? 'Seu condomínio' : 'Seu clube'}</p>
                <p className="text-sm font-semibold text-ink truncate">{selected.name}</p>
              </div>
            </Link>
          ) : (
            <span className="type-subtitle">Riff Clubes</span>
          )}
          <Link to="/perfil" aria-label="Seu perfil" className="shrink-0">
            <Avatar src={profile?.avatar_url} name={profile?.full_name} className="w-9 h-9" />
          </Link>
          </div>
          <p className="type-label mt-2 first-letter:uppercase">{format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
          <h1 className="type-display mt-1">Olá{firstName ? `, ${firstName}` : ''}!</h1>
          <p className="text-sm text-ink-muted mt-1 max-w-[18rem]">
            {noCommunity
              ? 'Vamos colocar você no seu condomínio ou clube.'
              : communities && !isLoading
                ? `Veja o que vai rolar ${todayItems.length ? 'hoje' : 'esta semana'} no seu ${place}.`
                : ''}
          </p>
          {!noCommunity && !isLoading && communities && (
            <div className="flex gap-2 mt-4">
              <span className="px-3 h-7 rounded-full bg-brand text-brand-ink text-xs font-bold flex items-center">
                {todayItems.length} hoje
              </span>
              <span className="px-3 h-7 rounded-full bg-elevated border border-line text-ink text-xs font-semibold flex items-center">
                {todayItems.length + restOfWeek.length} esta semana
              </span>
              {myRank && selected && (
                <Link
                  to={`/c/${selected.id}/ranking`}
                  className="px-3 h-7 rounded-full bg-elevated border border-brand/50 text-brand text-xs font-bold flex items-center gap-1"
                >
                  <Trophy className="w-3.5 h-3.5" /> {myRank.rank}º no ranking
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="pb-5 space-y-6">
        {isLoadingCommunities ? (
          <Spinner />
        ) : noCommunity ? (
          // Primeiro acesso: sem comunidade, a tela explica o caminho
          <section className="px-6 pt-6 space-y-4">
            <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
              <h2 className="type-subtitle">Como funciona</h2>
              {[
                { icon: KeyRound, text: 'Peça o código de convite ao síndico, ao gestor do clube ou a um vizinho que já usa.' },
                { icon: Users, text: 'Entre com o código: você passa a ver os eventos da comunidade.' },
                { icon: CalendarPlus, text: 'Participe ou crie jogos e eventos para os vizinhos.' },
              ].map((step, i) => (
                <div key={step.text} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand text-brand-ink flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-sm text-ink pt-1">{step.text}</p>
                </div>
              ))}
            </div>
            <JoinWithCode defaultOpen />
          </section>
        ) : (
          <>
            {/* Faixa da semana: ponto dourado nos dias com evento; tocar filtra */}
            <div className="relative z-10 -mt-8 mx-4 grid grid-cols-7 gap-1 p-2 bg-elevated border border-line rounded-2xl shadow-[var(--shadow-2)]" role="group" aria-label="Dias da semana">
              {week.map((d) => {
                const key = format(d, 'yyyy-MM-dd');
                const has = onDay(d).length > 0;
                const active = day === key;
                const isTodayCell = isSameDay(d, today);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDay(active ? null : key)}
                    aria-pressed={active}
                    aria-label={format(d, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    className={cn(
                      'flex flex-col items-center gap-0.5 py-2 rounded-xl border transition-colors',
                      active ? 'bg-brand border-brand' : isTodayCell ? 'border-brand/50' : 'border-transparent',
                    )}
                  >
                    <span className={cn('text-xs', active ? 'text-brand-ink' : 'text-ink-muted')}>
                      {format(d, 'EEEEEE', { locale: ptBR })}
                    </span>
                    <span className={cn('text-sm font-semibold', active ? 'text-brand-ink' : 'text-ink')}>{format(d, 'd')}</span>
                    <span
                      className={cn('w-1 h-1 rounded-full', has ? (active ? 'bg-brand-ink' : 'bg-brand') : 'bg-transparent')}
                    />
                  </button>
                );
              })}
            </div>

            <ReviewPrompt className="mx-4" />

            {pendingClose && pendingClose.length > 0 && selected && (
              <Link
                to={`/c/${selected.id}`}
                className="mx-4 flex items-center gap-3 rounded-2xl border border-accent/40 bg-surface px-4 py-3"
              >
                <ClipboardCheck className="w-5 h-5 text-accent shrink-0" />
                <span className="text-sm text-ink flex-1">
                  Falta fechar a presença de {pendingClose.length} evento{pendingClose.length > 1 ? 's' : ''}
                </span>
              </Link>
            )}

            {isLoading ? (
              <Spinner />
            ) : day ? (
              dayItems.length ? (
                <Section title={dayLabel} count={dayItems.length}>
                  {rows(dayItems)}
                </Section>
              ) : (
                <EmptyWeek title={`Nada marcado para ${dayLabel}`} onCreate={() => navigate('/criar')} />
              )
            ) : all.length === 0 ? (
              <EmptyWeek title="Ninguém marcou nada ainda" onCreate={() => navigate('/criar')} />
            ) : (
              <div className="space-y-6">
                {todayItems.length > 0 && (
                  <Section title="Hoje" count={todayItems.length}>
                    {rows(todayItems, { highlight: true })}
                  </Section>
                )}
                {restOfWeek.length > 0 ? (
                  <Section title="Esta semana" count={restOfWeek.length}>
                    {rows(restOfWeek, { showDay: true })}
                  </Section>
                ) : (
                  <EmptyWeek title="O resto da semana está livre" onCreate={() => navigate('/criar')} />
                )}
                {later.length > 0 && (
                  <Section title="Mais adiante" count={later.length}>
                    {rows(later, { showDay: true })}
                  </Section>
                )}
              </div>
            )}

            {/* Atalhos */}
            <div className="flex flex-wrap justify-center gap-2 px-4">
              <Shortcut to="/criar" icon={Plus} label="Criar jogo" />
              {selected?.isAdmin && <Shortcut to={`/c/${selected.id}/gestao`} icon={UserPlus} label="Convidar vizinhos" />}
              <Shortcut to="/dependentes" icon={Baby} label="Dependentes" />
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
