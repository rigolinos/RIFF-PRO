import { useState } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, Clock, Loader2, CheckCircle2, MessageCircle, Edit, XCircle, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { PageContainer } from '@/components/layout/PageContainer';
import { useProSessions } from '@/hooks/useProSessions';
import { useSessions } from '@/hooks/useSessions';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

const MySessionsPro = () => {
  const { sessions, isLoading, confirmPayment } = useProSessions();
  const { createSession } = useSessions();
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleOpenAttendance = (session: any) => {
    setSelectedSession(session);
  };

  const handleConfirmPix = async (bookingId: string) => {
    setIsUpdating(bookingId);
    try {
      await confirmPayment({ bookingId, status: 'paid' });
      setSelectedSession((prev: any) => ({
        ...prev,
        bookings: prev.bookings.map((b: any) => b.id === bookingId ? { ...b, payment_status: 'paid' } : b)
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleWhatsAppStudent = (studentPhone: string, studentName: string) => {
    if (!studentPhone) return;
    const cleanPhone = studentPhone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(`OlÃ¡ ${studentName.split(' ')[0]}! Aqui Ã© o profissional da Riff Pro.`);
    window.open(`https://wa.me/${finalPhone}?text=${text}`, '_blank');
  };

  // --- CANCEL SESSION ---
  const handleCancelSession = async (session: any) => {
    if (!window.confirm(`Tem certeza que deseja cancelar a turma "${session.title}"? Todos os alunos inscritos serÃ£o notificados.`)) return;

    setIsCanceling(session.id);
    try {
      // 1. Cancel all active bookings
      const { error: bookingsError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled_by_pro', cancelled_at: new Date().toISOString() })
        .eq('session_id', session.id)
        .not('status', 'like', 'cancelled%');

      if (bookingsError) throw bookingsError;

      // 2. Cancel the session itself
      const { error: sessionError } = await supabase
        .from('sessions')
        .update({ status: 'cancelled' })
        .eq('id', session.id);

      if (sessionError) throw sessionError;

      toast.success('Turma cancelada com sucesso.');

      // 3. Open WhatsApp with pre-formatted message for enrolled students
      const activeBookings = session.bookings?.filter((b: any) => !b.status.startsWith('cancelled')) || [];
      if (activeBookings.length > 0) {
        const dateStr = format(parseISO(session.date), "dd/MM", { locale: ptBR });
        const timeStr = session.start_time.substring(0, 5);
        const text = encodeURIComponent(
          `OlÃ¡ turma! Infelizmente precisei cancelar a aula "${session.title}" do dia ${dateStr} Ã s ${timeStr}. PeÃ§o desculpas pelo inconveniente. Qualquer dÃºvida, me chame!`
        );
        window.open(`https://wa.me/?text=${text}`, '_blank');
      }

      // Force reload
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao cancelar turma.');
    } finally {
      setIsCanceling(null);
    }
  };

  // --- DUPLICATE SESSION ---
  const handleDuplicateSession = async (session: any) => {
    setIsDuplicating(session.id);
    try {
      const nextWeekDate = format(addDays(parseISO(session.date), 7), 'yyyy-MM-dd');
      
      await createSession({
        category_id: session.category_id,
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

      toast.success(`Aula duplicada para ${format(parseISO(nextWeekDate), "EEE, d 'de' MMM", { locale: ptBR })}! ðŸ”`);
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao duplicar aula.');
    } finally {
      setIsDuplicating(null);
    }
  };

  return (
    <PageContainer title="Minhas Aulas" withBottomNav>
      <div className="px-6 py-6 flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl mx-auto mb-4">ðŸ“</div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhuma aula criada</h3>
            <p className="text-muted-foreground text-sm">Crie sua primeira turma e comece a receber alunos.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session, i) => {
              const dateStr = format(parseISO(session.date), "EEE, d 'de' MMM", { locale: ptBR });
              const timeStr = session.start_time.substring(0, 5);
              const isFull = session.current_participants >= session.max_participants;
              const isPast = parseISO(`${session.date}T${session.start_time}`) < new Date();
              const isCancelled = session.status === 'cancelled';
              
              const activeBookings = session.bookings?.filter((b: any) => !b.status.startsWith('cancelled')) || [];

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`glass-card p-4 hover:bg-white/[0.04] transition-colors relative ${isPast || isCancelled ? 'opacity-60' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2 cursor-pointer" onClick={() => handleOpenAttendance(session)}>
                    <h3 className="font-semibold text-base leading-tight truncate pr-4">
                      {session.category?.emoji} {session.title}
                    </h3>
                    {isCancelled ? (
                      <span className="text-[10px] uppercase font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-1 rounded shrink-0">Cancelada</span>
                    ) : isPast ? (
                      <span className="text-[10px] uppercase font-bold text-muted-foreground bg-white/5 px-2 py-1 rounded shrink-0">Finalizada</span>
                    ) : isFull ? (
                      <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded shrink-0">Lotada</span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded shrink-0">Ativa</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleOpenAttendance(session)}>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-white/5 px-2 py-1 rounded-md">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="capitalize">{dateStr} â€¢ {timeStr}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md bg-white/5">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span className={isFull ? 'text-emerald-400' : 'text-foreground'}>
                          {activeBookings.length} / {session.max_participants}
                        </span>
                      </div>
                    </div>
                    
                    {!isCancelled && (
                      <div className="flex items-center gap-1.5">
                                                {/* Copy Link */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = window.location.origin + '/session/' + session.id;
                            if (navigator.share) {
                              navigator.share({ title: session.title, url });
                            } else {
                              navigator.clipboard.writeText(url);
                              toast.success('Link direto copiado!');
                            }
                          }}
                          className="text-[11px] flex items-center gap-1 font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors"
                          title="Compartilhar Link Público"
                        >
                          <Share2 className="w-3 h-3" />
                        </button>

                        {/* Duplicate */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateSession(session);
                          }}
                          disabled={isDuplicating === session.id}
                          className="text-[11px] flex items-center gap-1 font-semibold text-muted-foreground bg-white/5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                          title="Duplicar para prÃ³xima semana"
                        >
                          {isDuplicating === session.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                        </button>

                        {!isPast && (
                          <>
                            {/* Edit */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/edit-session/${session.id}`);
                              }}
                              className="text-[11px] flex items-center gap-1 font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors"
                            >
                              <Edit className="w-3 h-3" />
                            </button>

                            {/* Cancel */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelSession(session);
                              }}
                              disabled={isCanceling === session.id}
                              className="text-[11px] flex items-center gap-1 font-semibold text-red-400 bg-red-400/10 px-2.5 py-1.5 rounded-lg hover:bg-red-400/20 transition-colors disabled:opacity-50"
                              title="Cancelar turma"
                            >
                              {isCanceling === session.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                            </button>
                          </>
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

      <Sheet open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <SheetContent side="bottom" className="h-[80vh] bg-background border-t border-white/10 p-0 flex flex-col rounded-t-3xl">
          <SheetHeader className="p-6 border-b border-white/5 text-left">
            <SheetTitle className="text-xl">{selectedSession?.title}</SheetTitle>
            <SheetDescription className="text-muted-foreground mt-1">
              {selectedSession?.current_participants} de {selectedSession?.max_participants} inscritos
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {selectedSession?.bookings?.filter((b: any) => !b.status.startsWith('cancelled')).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum aluno inscrito ainda.
                </div>
              ) : (
                selectedSession?.bookings?.filter((b: any) => !b.status.startsWith('cancelled')).map((booking: any) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
                        {booking.student?.avatar_url ? (
                          <img src={booking.student.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground">
                            {booking.student?.full_name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{booking.student?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{booking.student?.phone || 'Sem telefone'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleWhatsAppStudent(booking.student?.phone, booking.student?.full_name)}
                        className="w-8 h-8 rounded-full bg-[#25D366]/20 flex items-center justify-center text-[#25D366]"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>

                      {booking.payment_status === 'paid' ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleConfirmPix(booking.id)}
                          disabled={isUpdating === booking.id}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 disabled:opacity-50"
                        >
                          {isUpdating === booking.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Confirmar Pix'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
};

export default MySessionsPro;

