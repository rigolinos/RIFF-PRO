import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Baby, CalendarDays, ClipboardCheck, Clock, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@riff/core/hooks/useProfile';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { Avatar, CoverImage, SpotsMeter, StatusPill } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { KINDS, type ActivityKind } from '@riff/core/lib/copy';
import { useActivity } from '@/hooks/useActivities';
import { useAgendaActions, useCommunity } from '@/hooks/useCommunity';
import { useDependents, ageOn } from '@/hooks/useDependents';
import { SportIcon } from '@/components/SportIcon';

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { data: activity, isLoading } = useActivity(id);
  const orgId = activity?.organization_id ?? undefined;
  const { data: community } = useCommunity(orgId);
  const { book, cancel, bookDependent } = useAgendaActions();
  const { data: dependents } = useDependents();

  if (!isLoading && activity === null) return <Navigate to="/inicio" replace />;

  if (isLoading || !activity) {
    return (
      <PageContainer showBack withBottomNav={false}>
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </PageContainer>
    );
  }

  const kind = KINDS[activity.kind as ActivityKind];
  const max = activity.max_participants ?? 0;
  const current = activity.current_participants ?? 0;
  const full = current >= max || activity.status === 'full';
  const open = ['active', 'full'].includes(activity.status ?? '');
  const organizing = activity.professional_id === profile?.id;
  const canSeeRoster = organizing || !!community?.isAdmin;

  const run = async (action: () => Promise<unknown>, success: string, fallback: string) => {
    try {
      await action();
      toast.success(success);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : fallback);
    }
  };

  return (
    <PageContainer showBack headerTransparent withBottomNav={false}>
      <CoverImage
        src={activity.cover_image_url}
        categorySlug={activity.category?.slug ?? undefined}
        kind={activity.kind as ActivityKind}
        className="aspect-[16/9] -mt-16"
      />

      <div className="px-6 py-6 space-y-6 pb-32">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <StatusPill text={kind?.chip ?? 'Atividade'} variant="neutral" />
            {organizing && <StatusPill text="Você organiza" variant="info" />}
            {activity.myBookingId && <StatusPill text="Inscrito" variant="success" />}
            {!open && <StatusPill text={activity.status === 'cancelled' ? 'Cancelada' : 'Encerrada'} variant="danger" />}
          </div>
          <h1 className="type-display leading-tight">{activity.title}</h1>
          {activity.category?.name && (
            <p className="flex items-center gap-1.5 text-sm text-ink-muted">
              <SportIcon slug={activity.category?.slug} className="w-4 h-4 text-brand" /> {activity.category.name}
            </p>
          )}
          {activity.organization?.name && orgId && (
            <Link to={`/c/${orgId}`} className="text-sm text-brand underline underline-offset-4">
              {activity.organization.name}
            </Link>
          )}
        </div>

        <div className="space-y-2 text-sm text-ink">
          <p className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-ink-muted shrink-0" />
            <span className="first-letter:uppercase">{format(parseISO(activity.date), "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
          </p>
          <p className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-ink-muted shrink-0" /> {activity.start_time.substring(0, 5)}
            {activity.duration_minutes ? ` · ${activity.duration_minutes} min` : ''}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-ink-muted shrink-0" /> {activity.location_name || 'Local a confirmar'}
          </p>
          {activity.minors_allowed && (
            <p className="flex items-center gap-2 text-accent">
              <Users className="w-4 h-4 shrink-0" /> Aceita menores{activity.min_age ? ` a partir de ${activity.min_age} anos` : ''}
            </p>
          )}
        </div>

        {activity.professional?.full_name && (
          <div className="flex items-center gap-3 bg-surface border border-line rounded-xl p-3">
            <Avatar src={activity.professional.avatar_url} name={activity.professional.full_name} className="w-10 h-10" />
            <div>
              <p className="type-label">Quem organiza</p>
              <p className="text-sm font-medium text-ink">{activity.professional.full_name}</p>
            </div>
          </div>
        )}

        {activity.description && (
          <section className="space-y-2">
            <h2 className="type-subtitle">Sobre</h2>
            <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-line">{activity.description}</p>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="type-subtitle">Vagas</h2>
          <SpotsMeter current={current} max={max || 1} />
        </section>

        {open && activity.minors_allowed && dependents && dependents.length > 0 && (
          <section className="space-y-2">
            <h2 className="type-subtitle">Seus dependentes</h2>
            {dependents.map((d) => {
              const age = ageOn(d.birth_date, activity.date);
              const bookingId = activity.dependentBookings[d.id];
              const firstName = d.full_name.split(' ')[0];
              const tooYoung = activity.min_age != null && age < activity.min_age;
              return (
                <div key={d.id} className="flex items-center gap-3 bg-surface border border-line rounded-xl px-4 py-3">
                  <Baby className="w-5 h-5 text-brand shrink-0" />
                  <span className="text-sm text-ink flex-1 truncate">
                    {firstName} <span className="text-ink-muted">· {age} anos</span>
                  </span>
                  {bookingId ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={cancel.isPending}
                      onClick={() => run(() => cancel.mutateAsync(bookingId), `Inscrição de ${firstName} cancelada.`, 'Não foi possível cancelar.')}
                    >
                      Cancelar
                    </Button>
                  ) : tooYoung ? (
                    <span className="text-xs text-ink-muted">Abaixo da idade</span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={full || bookDependent.isPending}
                      onClick={() =>
                        run(
                          () => bookDependent.mutateAsync({ sessionId: activity.id, dependentId: d.id }),
                          `Inscrição de ${firstName} feita.`,
                          'Não foi possível fazer a inscrição.',
                        )
                      }
                    >
                      Inscrever
                    </Button>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </div>

      {/* Ações fixas no rodapé */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-bg/95 backdrop-blur-xl border-t border-line px-6 py-4 pb-safe space-y-2">
        {canSeeRoster && orgId && (
          <Button variant="secondary" className="w-full" onClick={() => navigate(`/c/${orgId}/atividade/${activity.id}`)}>
            <ClipboardCheck className="w-4 h-4 mr-2" /> Inscritos e presença
          </Button>
        )}
        {!open ? null : organizing ? (
          <p className="text-xs text-ink-muted text-center">Você organiza esta atividade.</p>
        ) : activity.myBookingId ? (
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            disabled={cancel.isPending}
            onClick={() => run(() => cancel.mutateAsync(activity.myBookingId!), 'Inscrição cancelada.', 'Não foi possível cancelar.')}
          >
            Cancelar minha inscrição
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-full"
            disabled={full || book.isPending}
            onClick={() => run(() => book.mutateAsync(activity.id), `Inscrição feita em "${activity.title}".`, 'Não foi possível fazer a inscrição.')}
          >
            {full ? 'Sem vagas' : 'Quero participar'}
          </Button>
        )}
      </div>
    </PageContainer>
  );
}
