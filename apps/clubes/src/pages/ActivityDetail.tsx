import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Baby, ClipboardCheck, MapPin, Share2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@riff/core/hooks/useProfile';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { Avatar, BrandLines, SpotsMeter, StatusPill } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { KINDS, type ActivityKind } from '@riff/core/lib/copy';
import { useActivity } from '@/hooks/useActivities';
import { useAgendaActions, useCommunity } from '@/hooks/useCommunity';
import { useDependents, ageOn } from '@/hooks/useDependents';
import { SportIcon } from '@/components/SportIcon';
import { WhoIsGoing } from '@/components/WhoIsGoing';
import { kidsLabel } from '@/lib/people';

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { data: activity, isLoading } = useActivity(id);
  const orgId = activity?.organization_id ?? undefined;
  const { data: community } = useCommunity(orgId);
  const { book, cancel, bookDependent } = useAgendaActions();
  const { data: dependents } = useDependents();
  const [showAll, setShowAll] = useState(false);

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

  const dateLong = format(parseISO(activity.date), "EEEE, d 'de' MMMM", { locale: ptBR });

  // Chamar os vizinhos: compartilhar pelo celular ou, sem suporte, pelo WhatsApp
  const handleShare = async () => {
    const url = window.location.href;
    const text = `${activity.title}: ${dateLong}, às ${activity.start_time.substring(0, 5)}${
      activity.organization?.name ? `, no ${activity.organization.name}` : ''
    }. Bora?`;
    if (navigator.share) {
      try {
        await navigator.share({ title: activity.title, text, url });
      } catch {
        // pessoa fechou a janela de compartilhar
      }
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank');
  };

  return (
    <PageContainer withBottomNav={false}>
      {/* Cabeçalho de destaque: foto do evento com véu, ou a arte da marca */}
      <section className="relative overflow-hidden bg-surface border-b border-line pb-16">
        {activity.cover_image_url ? (
          <>
            <img src={activity.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-bg/70" aria-hidden="true" />
          </>
        ) : (
          <>
            <BrandLines className="absolute inset-y-0 right-0 h-full w-3/4" />
            <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
          </>
        )}
        <div className="relative px-6 pt-safe">
          <div className="h-16 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="w-10 h-10 -ml-2 rounded-full bg-bg/50 backdrop-blur-sm flex items-center justify-center text-ink active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {open && (
              <button
                type="button"
                onClick={handleShare}
                aria-label="Compartilhar com os vizinhos"
                className="w-10 h-10 rounded-full bg-bg/50 backdrop-blur-sm flex items-center justify-center text-ink active:scale-95"
              >
                <Share2 className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <StatusPill text={kind?.chip ?? 'Atividade'} variant="neutral" />
            {organizing && <StatusPill text="Você organiza" variant="info" />}
            {activity.myBookingId && <StatusPill text="Inscrito" variant="success" />}
            {!open && <StatusPill text={activity.status === 'cancelled' ? 'Cancelada' : 'Encerrada'} variant="danger" />}
          </div>
          <h1 className="type-display leading-tight mt-3">{activity.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-ink-muted">
            {activity.category?.name && (
              <span className="flex items-center gap-1.5">
                <SportIcon slug={activity.category?.slug} className="w-4 h-4 text-brand" /> {activity.category.name}
              </span>
            )}
            {activity.organization?.name && orgId && (
              <Link to={`/c/${orgId}`} className="text-brand underline underline-offset-4">
                {activity.organization.name}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* "Ingresso": quando e onde, sobreposto ao cabeçalho */}
      <div className="relative z-10 -mt-10 mx-4 bg-elevated border border-line rounded-2xl shadow-[var(--shadow-2)] overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-line">
          <div className="p-3 text-center">
            <p className="type-label">{format(parseISO(activity.date), 'EEE', { locale: ptBR })}</p>
            <p className="type-title leading-tight">{format(parseISO(activity.date), 'd')}</p>
            <p className="text-xs text-ink-muted">{format(parseISO(activity.date), 'MMMM', { locale: ptBR })}</p>
          </div>
          <div className="p-3 text-center">
            <p className="type-label">Horário</p>
            <p className="type-title leading-tight">{activity.start_time.substring(0, 5)}</p>
            <p className="text-xs text-ink-muted">{activity.duration_minutes ? `${activity.duration_minutes} min` : 'duração livre'}</p>
          </div>
          <div className="p-3 text-center flex flex-col items-center">
            <p className="type-label">Local</p>
            <MapPin className="w-5 h-5 text-brand my-1" />
            <p className="text-xs text-ink line-clamp-2">{activity.location_name || 'A confirmar'}</p>
          </div>
        </div>
        {activity.minors_allowed && (
          <p className="flex items-center justify-center gap-2 border-t border-dashed border-line px-4 py-2 text-xs text-accent">
            <Users className="w-4 h-4 shrink-0" /> Aceita menores{activity.min_age ? ` a partir de ${activity.min_age} anos` : ''}
          </p>
        )}
      </div>

      <div className="px-6 py-6 space-y-6 pb-40">
        <section className="bg-surface border border-line rounded-2xl p-4 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="type-label">Vagas</p>
              <p className="text-sm text-ink-muted">
                <span className="type-display text-brand">{current}</span> de {max} inscritos
              </p>
            </div>
            <StatusPill
              text={full ? 'Lotado' : `${Math.max(0, max - current)} livre${max - current === 1 ? '' : 's'}`}
              variant={full ? 'danger' : max - current <= 2 ? 'alert' : 'success'}
            />
          </div>
          <SpotsMeter current={current} max={max || 1} />
        </section>

        {/* Quem vai: só membros da comunidade veem; menores só na contagem */}
        <section className="bg-surface border border-line rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="type-label">Quem vai</p>
            {activity.participants.count > 6 && (
              <button type="button" onClick={() => setShowAll((v) => !v)} className="text-xs text-brand font-semibold">
                {showAll ? 'Mostrar menos' : `Ver todos (${activity.participants.count})`}
              </button>
            )}
          </div>
          {activity.participants.count === 0 && activity.participants.dependents === 0 ? (
            <p className="text-sm text-ink-muted">{open ? 'Ninguém confirmou ainda. Seja o primeiro!' : 'Ninguém confirmou presença.'}</p>
          ) : showAll || activity.participants.count <= 6 ? (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
              {activity.participants.people.map((p) => (
                <li key={p.id} className="flex items-center gap-2 min-w-0">
                  <Avatar src={p.avatar_url} name={p.name} className="w-8 h-8" fallbackClassName="text-xs" />
                  <span className="text-sm text-ink truncate">{p.id === profile?.id ? 'Você' : p.name}</span>
                </li>
              ))}
              {activity.participants.dependents > 0 && (
                <li className="col-span-2 text-xs text-ink-muted">{kidsLabel(activity.participants.dependents)} inscritas pelos responsáveis</li>
              )}
            </ul>
          ) : (
            <WhoIsGoing participants={activity.participants} max={6} size="md" />
          )}
        </section>

        {activity.professional?.full_name && (
          <div className="flex items-center gap-3 bg-surface border border-line rounded-2xl p-4">
            <Avatar src={activity.professional.avatar_url} name={activity.professional.full_name} className="w-11 h-11" />
            <div className="min-w-0">
              <p className="type-label">Quem organiza</p>
              <p className="text-sm font-semibold text-ink truncate">{activity.professional.full_name}</p>
            </div>
          </div>
        )}

        {activity.description && (
          <section className="space-y-2">
            <h2 className="type-subtitle">Sobre</h2>
            <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-line">{activity.description}</p>
          </section>
        )}

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
