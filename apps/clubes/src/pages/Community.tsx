import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Clock, MapPin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { EmptyState, SpotsMeter, StatusPill } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { KINDS, type ActivityKind } from '@riff/core/lib/copy';
import { useCommunity, useCommunityAgenda, useAgendaActions, type AgendaItem } from '@/hooks/useCommunity';

const ROLE_LABEL: Record<string, string> = { owner: 'Gestor', admin: 'Gestor', instructor: 'Instrutor', member: 'Membro' };

export default function Community() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { data: community, isLoading } = useCommunity(orgId);
  const { data: agenda, isLoading: isLoadingAgenda, isError } = useCommunityAgenda(orgId);
  const { book, cancel } = useAgendaActions(orgId);

  if (!isLoading && community === null) return <Navigate to="/inicio" replace />;

  const handleBook = async (item: AgendaItem) => {
    try {
      await book.mutateAsync(item.id);
      toast.success(`Inscrição feita em "${item.title}".`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível fazer a inscrição.');
    }
  };

  const handleCancel = async (item: AgendaItem) => {
    if (!item.myBookingId) return;
    try {
      await cancel.mutateAsync(item.myBookingId);
      toast.success('Inscrição cancelada.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível cancelar.');
    }
  };

  return (
    <PageContainer title={community?.name ?? 'Comunidade'} showBack withBottomNav={false}>
      <div className="px-6 py-6 space-y-6 pb-24">
        {community && (
          <p className="type-label">
            {community.kind === 'condo' ? 'Condomínio' : 'Clube'} · {ROLE_LABEL[community.role] ?? community.role}
          </p>
        )}

        {community?.canManage && (
          <Button className="w-full" onClick={() => navigate(`/c/${orgId}/nova`)}>
            <Plus className="w-4 h-4 mr-2" /> Nova atividade
          </Button>
        )}

        <section>
          <h2 className="type-subtitle mb-3">Agenda</h2>
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
              description={
                community?.canManage
                  ? 'Crie a primeira atividade da comunidade no botão acima.'
                  : 'Quando o condomínio ou clube publicar atividades, elas aparecem aqui.'
              }
            />
          ) : (
            <ul className="space-y-3">
              {agenda.map((item) => {
                const kind = KINDS[item.kind as ActivityKind];
                const full = (item.current_participants ?? 0) >= (item.max_participants ?? 0);
                const dateLabel = format(parseISO(item.date), "EEEE, d 'de' MMM", { locale: ptBR });
                return (
                  <li key={item.id} className="bg-surface border border-line rounded-2xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="type-subtitle">
                          {item.category?.emoji} {item.title}
                        </h3>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {kind?.chip ?? 'Atividade'}
                          {item.professional?.full_name ? ` · com ${item.professional.full_name.split(' ')[0]}` : ''}
                        </p>
                      </div>
                      {item.myBookingId ? (
                        <StatusPill text="Inscrito" variant="success" />
                      ) : full ? (
                        <StatusPill text="Lotada" variant="danger" />
                      ) : null}
                    </div>

                    <div className="space-y-1 text-sm text-ink-muted">
                      <p className="flex items-center gap-2 first-letter:uppercase">
                        <CalendarDays className="w-4 h-4 shrink-0" /> <span className="first-letter:uppercase">{dateLabel}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4 shrink-0" /> {item.start_time.substring(0, 5)}
                        {item.duration_minutes ? ` · ${item.duration_minutes} min` : ''}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 shrink-0" /> {item.location_name}
                      </p>
                    </div>

                    <SpotsMeter current={item.current_participants ?? 0} max={item.max_participants ?? 1} />

                    {item.myBookingId ? (
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => handleCancel(item)}
                        disabled={cancel.isPending}
                      >
                        Cancelar inscrição
                      </Button>
                    ) : (
                      <Button className="w-full" onClick={() => handleBook(item)} disabled={full || book.isPending}>
                        {full ? 'Sem vagas' : 'Quero participar'}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
