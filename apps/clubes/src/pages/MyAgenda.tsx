import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Baby, CalendarCheck, ChevronRight } from 'lucide-react';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { EmptyState, StatusPill } from '@riff/core/domain';
import { useMyAgenda } from '@/hooks/useActivities';
import { SportIcon } from '@riff/core/domain/SportIcon';
import { ReviewPrompt } from '@/components/ReviewPrompt';

function SportTitle({ slug, title }: { slug: string | null | undefined; title: string }) {
  return (
    <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
      <SportIcon slug={slug} className="w-4 h-4 text-brand shrink-0" />
      <span className="truncate">{title}</span>
    </p>
  );
}

type Tab = 'upcoming' | 'organizing' | 'past';

const TABS: { key: Tab; label: string }[] = [
  { key: 'upcoming', label: 'Próximas' },
  { key: 'organizing', label: 'Organizo' },
  { key: 'past', label: 'Histórico' },
];

const RESULT: Record<string, { text: string; variant: 'success' | 'neutral' | 'danger' }> = {
  present: { text: 'Foi', variant: 'success' },
  late: { text: 'Atrasou', variant: 'success' },
  absent: { text: 'Faltou', variant: 'neutral' },
  excused: { text: 'Justificou', variant: 'neutral' },
};

const when = (date: string, time: string) =>
  `${format(parseISO(date), "EEE, d 'de' MMM", { locale: ptBR })} · ${time.substring(0, 5)}`;

// Agenda pessoal: onde a pessoa (e os dependentes) estão inscritos e o que ela organiza
export default function MyAgenda() {
  const navigate = useNavigate();
  const { data, isLoading } = useMyAgenda();
  const [tab, setTab] = useState<Tab>('upcoming');

  const empty = {
    upcoming: { title: 'Nenhuma inscrição por enquanto', description: 'Veja a agenda das suas comunidades e participe.', label: 'Ver atividades', to: '/inicio' },
    organizing: { title: 'Você não organiza nada ainda', description: 'Crie um jogo, uma aula ou um evento para a comunidade.', label: 'Criar atividade', to: '/criar' },
    past: { title: 'Sem histórico ainda', description: 'As atividades de que você participou aparecem aqui.', label: 'Ver atividades', to: '/inicio' },
  }[tab];

  return (
    <PageContainer title="Sua agenda">
      <div className="px-6 py-4 space-y-5">
        <div className="grid grid-cols-3 gap-1 bg-surface border border-line rounded-full p-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`h-9 rounded-full text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-brand text-brand-ink font-semibold' : 'text-ink-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'past' && <ReviewPrompt max={5} />}

        {isLoading || !data ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (tab === 'organizing' ? data.organizing : tab === 'upcoming' ? data.upcoming : data.past).length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title={empty.title}
            description={empty.description}
            action={{ label: empty.label, onClick: () => navigate(empty.to) }}
          />
        ) : tab === 'organizing' ? (
          <ul className="space-y-2">
            {data.organizing.map((s) => (
              <li key={s.id}>
                <Link to={`/atividade/${s.id}`} className="flex items-center gap-3 bg-surface border border-line rounded-xl px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <SportTitle slug={s.category?.slug} title={s.title} />
                    <p className="text-xs text-ink-muted truncate first-letter:uppercase">
                      {when(s.date, s.start_time)} · {s.organization?.name}
                    </p>
                  </div>
                  <span className="text-xs text-ink-muted shrink-0">
                    {s.current_participants ?? 0}/{s.max_participants ?? 0}
                  </span>
                  <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-2">
            {(tab === 'upcoming' ? data.upcoming : data.past).map((b) => {
              const s = b.session!;
              const result = b.attendance_status ? RESULT[b.attendance_status] : null;
              return (
                <li key={b.id}>
                  <Link to={`/atividade/${s.id}`} className="flex items-center gap-3 bg-surface border border-line rounded-xl px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <SportTitle slug={s.category?.slug} title={s.title} />
                      <p className="text-xs text-ink-muted truncate first-letter:uppercase">
                        {when(s.date, s.start_time)} · {s.organization?.name}
                      </p>
                      {b.dependent && (
                        <p className="text-xs text-accent flex items-center gap-1 mt-0.5">
                          <Baby className="w-3.5 h-3.5" /> {b.dependent.full_name ?? 'Dependente removido'}
                        </p>
                      )}
                    </div>
                    {result ? (
                      <StatusPill text={result.text} variant={result.variant} />
                    ) : s.status === 'cancelled' ? (
                      <StatusPill text="Cancelada" variant="danger" />
                    ) : null}
                    <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
