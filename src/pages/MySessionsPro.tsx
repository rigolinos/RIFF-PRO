import { useState } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Users, Clock, Loader2,
  Edit, XCircle, Copy, Share2, ClipboardCheck, CalendarDays
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage } from '@riff/core/lib/utils';

import { PageContainer } from '@riff/core/layout/PageContainer';
import { useProSessions } from '@/hooks/useProSessions';
import { useSessions } from '@/hooks/useSessions';
import { EmptyState } from '@riff/core/domain';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@riff/core/ui/alert-dialog';

const MySessionsPro = () => {
  const { sessions, isLoading, isError, error, cancelSession, updateSessionStatus } = useProSessions();
  if (isError && error) console.error('Error fetching pro sessions:', error);
  
  type SessionType = NonNullable<typeof sessions>[0];
  type BookingType = NonNullable<SessionType['bookings']>[0];

  const { createSession } = useSessions();
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
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
      toast.error(errorMessage(error, 'Erro ao duplicar atividade.'));
    } finally {
      setIsDuplicating(null);
    }
  };

  const isPast = (s: SessionType) => parseISO(`${s.date}T${s.start_time}`) < new Date();
  const isCancelled = (s: SessionType) => s.status === 'cancelled';
  const isCompleted = (s: SessionType) => s.status === 'completed';

  return (
    <PageContainer title="Minhas Atividades" withBottomNav>
      <div className="px-6 py-6 flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand animate-spin" />
          </div>
        ) : !sessions || sessions.length === 0 ? (
                    <EmptyState 
            icon={CalendarDays}
            title="Nenhuma atividade criada" 
            description="Você ainda não criou nenhuma atividade." 
            action={{ label: 'Criar Atividade', onClick: () => navigate('/create-session') }} 
          />
        ) : (
          <div className="space-y-4">
            {sessions.map((session, i) => {
              const _dateStr = format(parseISO(session.date), "EEE, d 'de' MMM", { locale: ptBR });
              const dateStr = _dateStr.charAt(0).toUpperCase() + _dateStr.slice(1);
              const timeStr = session.start_time.substring(0, 5);
              const isFull = (session.current_participants ?? 0) >= (session.max_participants ?? 1);
              const past = isPast(session);
              const cancelled = isCancelled(session);
              const completed = isCompleted(session);
              const canClose = past && !cancelled && !completed;
              const activeBookings = session.bookings?.filter((b: BookingType) => !(b.status || '').startsWith('cancelled') && b.status !== 'no_show') || [];

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`glass-card p-4 hover:bg-white/[0.04] transition-colors relative ${past || cancelled ? 'opacity-60' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2 cursor-pointer" onClick={() => navigate(`/session/${session.id}/attendance`)}>
                    <h3 className="type-subtitle truncate pr-4">
                      {session.category?.emoji} {session.title}
                    </h3>
                    {cancelled ? (
                      <span className="text-xs font-semibold text-danger bg-danger/15 border border-danger px-2 py-1 rounded shrink-0">Cancelada</span>
                    ) : completed ? (
                      <span className="text-xs font-semibold text-brand bg-brand/10 border border-brand/20 px-2 py-1 rounded shrink-0">Encerrada</span>
                    ) : past ? (
                      <span className="text-xs font-semibold text-accent bg-accent/15 border border-accent/20 px-2 py-1 rounded shrink-0">Encerrar</span>
                    ) : isFull ? (
                      <span className="text-xs font-semibold text-brand bg-brand/10 border border-brand/20 px-2 py-1 rounded shrink-0">Lotada</span>
                    ) : (
                      <span className="text-xs font-semibold text-accent bg-accent/15 border border-accent/20 px-2 py-1 rounded shrink-0">Ativa</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/session/${session.id}/attendance`)}>
                      <div className="flex items-center gap-1.5 text-xs text-ink-muted bg-white/5 px-2 py-1 rounded-md">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="whitespace-nowrap">{dateStr} • {timeStr}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-white/5">
                        <Users className="w-3.5 h-3.5 text-brand" />
                        <span className="whitespace-nowrap">{activeBookings.length} / {session.max_participants}</span>
                      </div>
                    </div>

                    {!cancelled && !completed && (
                      <div className="flex items-center gap-1.5">
                        {/* Share Link */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = `${window.location.origin}/session/${session.id}`;
                            if (navigator.share) {
                              navigator.share({ title: session.title, url });
                            } else {
                              navigator.clipboard.writeText(url);
                              toast.success('Link direto copiado!');
                            }
                          }}
                          className="text-xs flex items-center gap-1 font-semibold text-brand bg-brand/10 px-2.5 py-1.5 rounded-lg hover:bg-brand/20 transition-colors"
                        >
                          <Share2 className="w-3 h-3" />
                        </button>

                        {/* Duplicate */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDuplicateSession(session); }}
                          disabled={isDuplicating === session.id}
                          className="text-xs flex items-center gap-1 font-semibold text-ink-muted bg-white/5 px-2.5 py-1.5 rounded-lg hover:bg-line transition-colors disabled:opacity-50"
                        >
                          {isDuplicating === session.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                        </button>

                        {!past && (
                          <>
                            {/* Edit */}
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/edit-session/${session.id}`); }}
                              className="text-xs flex items-center gap-1 font-semibold text-brand bg-brand/10 px-2.5 py-1.5 rounded-lg hover:bg-brand/20 transition-colors"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            
                            {/* Close Registrations Early */}
                            {!isFull && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCloseRegistrations(session); }}
                                className="text-xs flex items-center gap-1 font-semibold text-accent bg-accent/15 px-2.5 py-1.5 rounded-lg hover:bg-accent/15 transition-colors"
                                title="Encerrar Inscrições"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            )}


                            {/* Cancel with AlertDialog */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs flex items-center gap-1 font-semibold text-danger bg-danger/15 px-2.5 py-1.5 rounded-lg hover:bg-danger/15 transition-colors"
                                >
                                  <XCircle className="w-3 h-3" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-bg border-line">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancelar atividade "{session.title}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Todos os participantes inscritos serão notificados. Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-white/5 hover:bg-line border-0">Manter</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleCancelSession(session)} className="bg-danger/15 hover:bg-danger/15 text-ink">
                                    Sim, cancelar atividade
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}

                        {/* Close Session button (past, not cancelled/completed) */}
                        {canClose && (
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/session/${session.id}/attendance`); }}
                            className="text-xs flex items-center gap-1 font-semibold text-accent bg-accent/15 px-2.5 py-1.5 rounded-lg hover:bg-accent/15 transition-colors"
                          >
                            <ClipboardCheck className="w-3 h-3" /> Encerrar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default MySessionsPro;
