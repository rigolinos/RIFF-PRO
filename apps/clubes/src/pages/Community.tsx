import { Link, useParams, useNavigate, Navigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronRight, ClipboardCheck, Plus, Settings } from 'lucide-react';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { EmptyState } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { useCommunity } from '@/hooks/useCommunity';
import { useUpcomingActivities } from '@/hooks/useActivities';
import { usePendingClose } from '@/hooks/useManagement';
import { ActivityCard } from '@/components/ActivityCard';
import { ROLE_LABEL } from '@/lib/roles';

// Página de uma comunidade: agenda dela e, para o gestor, o atalho da gestão
export default function Community() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { data: community, isLoading } = useCommunity(orgId);
  const { data: agenda, isLoading: isLoadingAgenda, isError } = useUpcomingActivities(orgId ? [orgId] : undefined);
  const { data: pendingClose } = usePendingClose(community ? orgId : undefined, !!community?.isAdmin);

  if (!isLoading && community === null) return <Navigate to="/comunidades" replace />;

  return (
    <PageContainer title={community?.name ?? 'Comunidade'} showBack>
      <div className="px-6 py-6 space-y-6">
        {community && (
          <p className="type-label">
            {community.kind === 'condo' ? 'Condomínio' : 'Clube'} · {ROLE_LABEL[community.role] ?? community.role}
          </p>
        )}

        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => navigate(`/c/${orgId}/nova`)}>
            <Plus className="w-4 h-4 mr-2" /> Criar atividade
          </Button>
          {community?.isAdmin && (
            <Button variant="secondary" className="flex-1" onClick={() => navigate(`/c/${orgId}/gestao`)}>
              <Settings className="w-4 h-4 mr-2" /> Gestão
            </Button>
          )}
        </div>

        {pendingClose && pendingClose.length > 0 && (
          <section>
            <h2 className="type-subtitle mb-3">Falta fechar a presença</h2>
            <ul className="space-y-2">
              {pendingClose.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/c/${orgId}/atividade/${s.id}`}
                    className="flex items-center gap-3 bg-surface border border-accent/40 rounded-xl px-4 py-3"
                  >
                    <ClipboardCheck className="w-5 h-5 text-accent shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">
                        {s.category?.emoji} {s.title}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {format(parseISO(s.date), 'dd/MM', { locale: ptBR })} · {s.start_time.substring(0, 5)} · {s.current_participants ?? 0} inscritos
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="type-subtitle">Agenda</h2>
          {isLoadingAgenda || isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isError ? (
            <EmptyState title="Não foi possível carregar a agenda" description="Tente novamente em instantes." />
          ) : !agenda || agenda.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nenhuma atividade marcada"
              description="Crie a primeira atividade da comunidade: um jogo, uma aula ou um evento."
            />
          ) : (
            agenda.map((a) => <ActivityCard key={a.id} activity={a} showCommunity={false} />)
          )}
        </section>
      </div>
    </PageContainer>
  );
}
