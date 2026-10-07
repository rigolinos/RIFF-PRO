import { useState } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, Loader2, Edit, XCircle, Copy, Share2, ClipboardCheck, CalendarDays, MoreHorizontal, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { shareActivity } from '@/lib/share';
import { errorMessage } from '@riff/core/lib/utils';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { HeroHeader } from '@riff/core/layout/HeroHeader';
import { ConfirmDialog, EmptyState, TicketGrid } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@riff/core/ui/dropdown-menu';
import { useProSessions } from '@/hooks/useProSessions';
import { useSessions } from '@/hooks/useSessions';
import { ProSessionRow } from '@/components/cards/ProSessionRow';

const MySessionsPro = () => {
  const { sessions, isLoading, isError, error, cancelSession, updateSessionStatus } = useProSessions();
  if (isError && error) console.error('Error fetching pro sessions:', error);
  
  type SessionType = NonNullable<typeof sessions>[0];
  type BookingType = NonNullable<SessionType['bookings']>[0];

  const { createSession } = useSessions();
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'toClose' | 'done'>('upcoming');
  const [toCancel, setToCancel] = useState<SessionType | null>(null);
  const navigate = useNavigate();

  const handleCancelSession = async (session: SessionType) => {
    try {
      await cancelSession({ sessionId: session.id, reason: 'Cancelamento pelo organizador' });
      toast.success('Atividade cancelada.');

      // Open WhatsApp with pre-formatted message
      const activeBookings = session.bookings?.filter((b: BookingType) => !(b.status || '').startsWith('cancelled')) || [];
      if (activeBookings.length > 0) {
        const dateStr = format(parseISO(session.date), "dd/MM", { locale: ptBR });
        const timeStr = session.start_time.substring(0, 5);
        const text = encodeURIComponent(
          `Olá pessoal! Infelizmente precisei cancelar a atividade "${session.title}" do dia ${dateStr} às ${timeStr}. Peço desculpas pelo inconveniente!`
        );
        window.open(`https://wa.me/?text=${text}`, '_blank');
      }
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Erro ao cancelar atividade.'));
    }
  };

  const handleCloseRegistrations = async (session: SessionType) => {
    try {
      await updateSessionStatus({ sessionId: session.id, status: 'full' });
      toast.success('Inscrições encerradas antecipadamente.');
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Erro ao encerrar inscrições.'));
    }
  };

  const handleDuplicateSession = async (session: SessionType) => {
    setIsDuplicating(session.id);
    try {
      const nextWeekDate = format(addDays(parseISO(session.date), 7), 'yyyy-MM-dd');
      await createSession({
        category_id: session.category_id,
        kind: session.kind,
        city: session.city,
        title: session.title,
        description: session.description,
        session_type: session.session_type,
        date: nextWeekDate,
        start_time: session.start_time,
        duration_minutes: session.duration_minutes,
        location_name: session.location_name,
        location_address: session.location_address,
        max_participants: session.max_participants,
        price_per_slot: session.price_per_slot,
        status: 'active',
      });
      toast.success(`Atividade duplicada para ${format(parseISO(nextWeekDate), "EEE, d 'de' MMM", { locale: ptBR })}!`);
    } catch (error: unknown) {
      if (errorMessage(error, '').includes('organizer_profile_incomplete')) {
        toast.error('Complete seu cadastro de organizador para publicar.');
        navigate('/onboarding/pro?next=/my-sessions');
      } else {
        toast.error(errorMessage(error, 'Erro ao duplicar atividade.'));
      }
    } finally {
      setIsDuplicating(null);
    }
  };

  const isPast = (s: SessionType) => parseISO(`${s.date}T${s.start_time}`) < new Date();
  const isCancelled = (s: SessionType) => s.status === 'cancelled';
  const isCompleted = (s: SessionType) => s.status === 'completed';

  const all = sessions ?? [];
  const upcoming = all.filter((s) => !isPast(s) && !isCancelled(s) && !isCompleted(s)).sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`));
  const toClose = all.filter((s) => isPast(s) && !isCancelled(s) && !isCompleted(s));
  const done = all.filter((s) => isCancelled(s) || isCompleted(s));
  const list = tab === 'upcoming' ? upcoming : tab === 'toClose' ? toClose : done;

  // convite com mensagem (só o link, sem texto, parecia golpe no WhatsApp)
  const share = (session: SessionType) => void shareActivity(session, { isOwner: true });

  const actionsFor = (session: SessionType) => {
    const past = isPast(session);
    const cancelled = isCancelled(session);
    const completed = isCompleted(session);
    const isFull = (session.current_participants ?? 0) >= (session.max_participants ?? 1);
    if (cancelled || completed) {
      return (
        <Button variant="secondary" size="sm" className="w-full" onClick={() => handleDuplicateSession(session)} disabled={isDuplicating === session.id}>
          {isDuplicating === session.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Copy className="w-4 h-4 mr-2" />} Repetir na semana seguinte
        </Button>
      );
    }
    return (
      <div className="flex gap-2">
        {past ? (
          <Button size="sm" className="flex-1" onClick={() => navigate(`/session/${session.id}/attendance`)}>
            <ClipboardCheck className="w-4 h-4 mr-2" /> Fazer a chamada
          </Button>
        ) : (
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => share(session)}>
            <Share2 className="w-4 h-4 mr-2" /> Compartilhar
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" aria-label={`Mais opções de ${session.title}`}>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-elevated border-line">
            <DropdownMenuItem onSelect={() => navigate(`/session/${session.id}/attendance`)}>
              <Users className="w-4 h-4 mr-2" /> Inscritos e presença
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleDuplicateSession(session)}>
              <Copy className="w-4 h-4 mr-2" /> Repetir na semana seguinte
            </DropdownMenuItem>
            {!past && (
              <DropdownMenuItem onSelect={() => navigate(`/edit-session/${session.id}`)}>
                <Edit className="w-4 h-4 mr-2" /> Editar
              </DropdownMenuItem>
            )}
            {!past && !isFull && (
              <DropdownMenuItem onSelect={() => handleCloseRegistrations(session)}>
                <Lock className="w-4 h-4 mr-2" /> Encerrar inscrições
              </DropdownMenuItem>
            )}
            {!past && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-danger" onSelect={() => setToCancel(session)}>
                  <XCircle className="w-4 h-4 mr-2" /> Cancelar atividade
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const TABS = [
    { key: 'upcoming' as const, label: 'Próximas', n: upcoming.length },
    { key: 'toClose' as const, label: 'Fechar', n: toClose.length },
    { key: 'done' as const, label: 'Passadas', n: done.length },
  ];

  return (
    <PageContainer withBottomNav>
      <HeroHeader overlap label="Atividades" title="Suas atividades" subtitle="Compartilhe, faça a chamada e repita as que deram certo." />

      <TicketGrid
        items={[
          { label: 'Próximas', value: upcoming.length },
          { label: 'Fechar presença', value: <span className={toClose.length ? 'text-accent' : ''}>{toClose.length}</span> },
          { label: 'Passadas', value: done.length },
        ]}
      />

      <div className="px-4 py-6 flex-1 flex flex-col space-y-4">
        <div className="grid grid-cols-3 gap-1 bg-surface border border-line rounded-full p-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`h-9 rounded-full text-sm font-medium transition-colors ${tab === t.key ? 'bg-brand text-brand-ink font-semibold' : 'text-ink-muted'}`}
            >
              {t.label}
              {t.n ? ` · ${t.n}` : ''}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-brand animate-spin" />
          </div>
        ) : all.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhuma atividade criada"
            description="Crie a primeira e compartilhe o link com seus participantes."
            action={{ label: 'Criar atividade', onClick: () => navigate('/create-session') }}
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={tab === 'upcoming' ? 'Nada marcado à frente' : tab === 'toClose' ? 'Tudo em dia' : 'Nada por aqui ainda'}
            description={
              tab === 'upcoming'
                ? 'Crie a próxima atividade ou repita uma que já aconteceu.'
                : tab === 'toClose'
                  ? 'Nenhuma atividade esperando a chamada.'
                  : 'As atividades encerradas e canceladas aparecem aqui.'
            }
            action={tab === 'upcoming' ? { label: 'Criar atividade', onClick: () => navigate('/create-session') } : undefined}
          />
        ) : (
          <div className="space-y-3">
            {list.map((session) => (
              <div key={session.id} className="bg-surface border border-line rounded-2xl overflow-hidden">
                <ProSessionRow session={session} showDay action={actionsFor(session)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!toCancel}
        onOpenChange={(open) => !open && setToCancel(null)}
        title={toCancel ? `Cancelar "${toCancel.title}"?` : 'Cancelar atividade?'}
        description="As reservas são canceladas e abrimos o WhatsApp com uma mensagem pronta para avisar os inscritos. Não dá para desfazer."
        cancelLabel="Manter"
        confirmLabel="Cancelar atividade"
        isDestructive
        onConfirm={async () => {
          if (toCancel) await handleCancelSession(toCancel);
          setToCancel(null);
        }}
      />
    </PageContainer>
  );
};

export default MySessionsPro;
