import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarPlus, KeyRound, Search, Sparkles, Users } from 'lucide-react';
import { useProfile } from '@riff/core/hooks/useProfile';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { EmptyState } from '@riff/core/domain';
import { Logo } from '@riff/core/ui/logo';
import { useMyCommunities, useUpcomingActivities, type Activity } from '@/hooks/useActivities';
import { ActivityCard } from '@/components/ActivityCard';
import { JoinWithCode } from '@/components/JoinWithCode';

const Spinner = () => (
  <div className="flex justify-center py-12">
    <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
  </div>
);

const dayLabel = (date: string) => {
  const d = parseISO(date);
  if (isToday(d)) return 'Hoje';
  if (isTomorrow(d)) return 'Amanhã';
  return format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
};

// Primeira tela depois de entrar: o que está acontecendo nas comunidades da pessoa
export default function Home() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { data: communities, isLoading: isLoadingCommunities } = useMyCommunities();
  const orgIds = useMemo(() => communities?.map((c) => c.id), [communities]);
  const { data: activities, isLoading } = useUpcomingActivities(orgIds);
  const [filter, setFilter] = useState<string>('all');

  const firstName = profile?.full_name?.split(' ')[0];
  const kinds = new Set(communities?.map((c) => c.kind));
  const place = kinds.size === 1 ? (kinds.has('condo') ? 'condomínio' : 'clube') : 'condomínio ou clube';
  const hasToday = (activities ?? []).some((a) => isToday(parseISO(a.date)));
  const visible = (activities ?? []).filter((a) => filter === 'all' || a.organization_id === filter);
  const mine = (activities ?? []).find(
    (a) => a.myBookingId || Object.keys(a.dependentBookings).length > 0 || a.professional_id === profile?.id,
  );

  // a atividade em destaque não se repete na lista
  const groups = visible.filter((a) => a.id !== mine?.id).reduce<{ label: string; items: Activity[] }[]>((acc, a) => {
    const label = dayLabel(a.date);
    const last = acc[acc.length - 1];
    if (last?.label === label) last.items.push(a);
    else acc.push({ label, items: [a] });
    return acc;
  }, []);

  return (
    <PageContainer>
      <div className="px-6 pt-8 pb-4 space-y-1">
        <Logo variant="icon" size="sm" className="justify-start mb-4" />
        <h1 className="type-display">Olá{firstName ? `, ${firstName}` : ''}!</h1>
        <p className="text-ink-muted">
          {isLoadingCommunities
            ? ''
            : communities && communities.length > 0
            ? `Veja o que vai rolar ${hasToday ? 'hoje' : 'nos próximos dias'} no seu ${place}.`
            : 'Vamos colocar você no seu condomínio ou clube.'}
        </p>
      </div>

      <div className="px-6 pb-6 space-y-6">
        {isLoadingCommunities ? (
          <Spinner />
        ) : !communities || communities.length === 0 ? (
          // Primeiro acesso: sem comunidade, a tela explica o caminho
          <section className="space-y-4">
            <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
              <h2 className="type-subtitle">Como funciona</h2>
              {[
                { icon: KeyRound, text: 'Peça o código de convite ao síndico, ao gestor do clube ou a um vizinho que já usa.' },
                { icon: Users, text: 'Entre com o código: você passa a ver a agenda da comunidade.' },
                { icon: CalendarPlus, text: 'Participe das atividades ou crie jogos e eventos para os vizinhos.' },
              ].map((step, i) => (
                <div key={step.text} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand text-brand-ink flex items-center justify-center text-sm font-bold shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-sm text-ink pt-1.5">{step.text}</p>
                </div>
              ))}
            </div>
            <JoinWithCode defaultOpen />
          </section>
        ) : (
          <>
            {mine && (
              <section className="space-y-3">
                <h2 className="type-subtitle flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand" /> Sua próxima atividade
                </h2>
                <ActivityCard activity={mine} />
              </section>
            )}

            {communities.length > 1 && (
              <div className="flex overflow-x-auto hide-scrollbar gap-2 -mx-6 px-6">
                {[{ id: 'all', name: 'Todas' }, ...communities].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFilter(c.id)}
                    className={`shrink-0 px-4 h-10 rounded-full text-sm font-medium transition-colors ${
                      filter === c.id ? 'bg-brand text-brand-ink font-semibold' : 'bg-surface border border-line text-ink-muted'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {isLoading ? (
              <Spinner />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Nenhuma atividade marcada"
                description="Que tal começar? Crie um jogo ou evento e chame os vizinhos."
                action={{ label: 'Criar atividade', onClick: () => navigate('/criar') }}
              />
            ) : (
              <div className="space-y-8">
                {groups.map((g) => (
                  <section key={g.label} className="space-y-3">
                    <h2 className="type-subtitle first-letter:uppercase">{g.label}</h2>
                    {g.items.map((a) => (
                      <ActivityCard key={a.id} activity={a} showCommunity={communities.length > 1} />
                    ))}
                  </section>
                ))}
              </div>
            )}

            <Link to="/comunidades" className="block text-center text-sm text-brand underline underline-offset-4">
              Ver seus clubes e condomínios
            </Link>
          </>
        )}
      </div>
    </PageContainer>
  );
}
