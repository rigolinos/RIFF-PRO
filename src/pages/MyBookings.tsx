import { useState, useMemo } from 'react';
import { differenceInHours, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { MapPin, MessageCircle, XCircle, Loader2, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

import { PageContainer } from '@/components/layout/PageContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBookings } from '@/hooks/useBookings';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { useProfile } from '@/hooks/useProfile';
import { ReviewModal } from '@/components/reviews/ReviewModal';

const MyBookings = () => {
  const { profile } = useProfile();
  const { bookings, isLoading, cancelBooking, isCanceling } = useBookings();
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [reviewBooking, setReviewBooking] = useState<any>(null);

  // Split bookings between upcoming and history
  const { upcoming, history } = useMemo(() => {
    if (!bookings) return { upcoming: [], history: [] };

    const now = new Date();
    const up: any[] = [];
    const hist: any[] = [];

    bookings.forEach((booking) => {
      // Check if session date + time is in the future and not cancelled
      const sessionDate = parseISO(`${booking.session.date}T${booking.session.start_time}`);
      const isFuture = sessionDate > now;
      const isActive = booking.status === 'pending' || booking.status === 'confirmed';

      if (isFuture && isActive) {
        up.push(booking);
      } else {
        hist.push(booking);
      }
    });

    // Sort upcoming (soonest first)
    up.sort((a, b) => {
      return new Date(`${a.session.date}T${a.session.start_time}`).getTime() - 
             new Date(`${b.session.date}T${b.session.start_time}`).getTime();
    });

    return { upcoming: up, history: hist };
  }, [bookings]);

  const handleWhatsApp = (booking: any) => {
    const proPhone = booking.professional?.whatsapp_number || booking.professional?.phone;
    if (!proPhone) {
      toast.error('O profissional não cadastrou o WhatsApp.');
      return;
    }

    const url = buildWhatsAppUrl({
      phone: proPhone,
      studentName: profile?.full_name?.split(' ')[0] || 'Aluno',
      proName: booking.professional?.full_name?.split(' ')[0] || 'Prof',
      sessionTitle: booking.session.category?.name || booking.session.title,
      sessionTime: booking.session.start_time.substring(0, 5),
    });

    window.open(url, '_blank');
  };

  const handleOpenMap = (booking: any) => {
    const address = booking.session.location_address || booking.session.location_name;
    const url = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  const handleCancel = async (booking: any) => {
    const sessionDate = parseISO(`${booking.session.date}T${booking.session.start_time}`);
    const hoursDifference = differenceInHours(sessionDate, new Date());

    if (hoursDifference < 4) {
      toast.error('Faltam menos de 4 horas para a aula. Entre em contato direto com o profissional para cancelar.');
      return;
    }

    if (!window.confirm('Tem certeza que deseja cancelar esta reserva?')) return;

    setCancelingId(booking.id);
    try {
      await cancelBooking(booking.id);
      toast.success('Reserva cancelada com sucesso.');
    } catch (error) {
      toast.error('Erro ao cancelar reserva.');
    } finally {
      setCancelingId(null);
    }
  };

  const renderBookingCard = (booking: any, isHistory: boolean = false) => {
    const sessionDate = parseISO(booking.session.date);
    const timeStr = booking.session.start_time.substring(0, 5);
    const dateStr = format(sessionDate, "EEE, d 'de' MMM", { locale: ptBR });
    
    // Status text definition
    let statusText = '';
    let statusColor = '';
    
    // Infer completed status if past date and not cancelled
    const isPast = parseISO(`${booking.session.date}T${booking.session.start_time}`) < new Date();
    const effectiveStatus = (isPast && !booking.status.startsWith('cancelled')) ? 'completed' : booking.status;

    if (effectiveStatus === 'cancelled_by_student') { statusText = 'Cancelada por você'; statusColor = 'text-red-400 bg-red-400/10 border-red-400/20'; }
    else if (effectiveStatus === 'cancelled_by_pro') { statusText = 'Aula cancelada'; statusColor = 'text-red-400 bg-red-400/10 border-red-400/20'; }
    else if (effectiveStatus === 'completed') { statusText = 'Concluída'; statusColor = 'text-muted-foreground bg-white/5 border-white/10'; }
    else if (booking.payment_status === 'pending') { statusText = 'Aguardando Pagamento'; statusColor = 'text-amber-400 bg-amber-400/10 border-amber-400/20'; }
    else if (booking.payment_status === 'paid') { statusText = 'Confirmada'; statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'; }
    else { statusText = effectiveStatus; statusColor = 'text-muted-foreground bg-white/5 border-white/10'; }


    return (
      <div key={booking.id} className="glass-card overflow-hidden flex flex-col mb-4">
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold text-lg text-foreground leading-tight">
                {booking.session.category?.emoji} {booking.session.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                com {booking.professional?.full_name}
              </p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider border ${statusColor}`}>
              {statusText}
            </span>
          </div>

          <div className="flex gap-4 items-center bg-white/[0.03] p-3 rounded-xl border border-white/5">
            <div className="flex-1 border-r border-white/10">
              <p className="text-xs text-muted-foreground mb-0.5">Quando</p>
              <p className="text-sm font-medium capitalize">{dateStr}</p>
              <p className="text-xs font-semibold text-emerald-400">{timeStr}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-0.5">Onde</p>
              <p className="text-sm font-medium truncate">{booking.session.location_name}</p>
              <button 
                onClick={() => handleOpenMap(booking)}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mt-0.5"
              >
                <MapPin className="w-3 h-3" /> Ver Mapa
              </button>
            </div>
          </div>
        </div>

        {!isHistory ? (
          <div className="border-t border-white/5 bg-white/[0.02] p-3 flex gap-2">
            <button
              onClick={() => handleWhatsApp(booking)}
              className="flex-1 h-10 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Falar com o Prof.
            </button>
            
            <button
              onClick={() => handleCancel(booking)}
              disabled={cancelingId === booking.id}
              className="flex-1 h-10 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              {cancelingId === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Cancelar
            </button>
          </div>
        ) : (
          booking.status === 'completed' && (
            <div className="border-t border-white/5 bg-white/[0.02] p-3 flex">
              <button
                onClick={() => setReviewBooking(booking)}
                className="flex-1 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                Avaliar Aula
              </button>
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <PageContainer title="Minhas Reservas" withBottomNav>
      <div className="px-6 py-6 flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="w-full bg-white/[0.05] border border-white/10 h-12 rounded-xl mb-6 p-1">
              <TabsTrigger value="upcoming" className="flex-1 rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-black text-muted-foreground font-medium transition-all">
                Próximas Aulas
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-foreground text-muted-foreground font-medium transition-all">
                Histórico
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="upcoming" className="mt-0">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {upcoming.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl mx-auto mb-4">📅</div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">Nenhuma aula agendada</h3>
                      <p className="text-muted-foreground text-sm">Que tal explorar novas turmas e agendar seu próximo treino?</p>
                    </div>
                  ) : (
                    upcoming.map(b => renderBookingCard(b, false))
                  )}
                </motion.div>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {history.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Seu histórico de aulas aparecerá aqui.
                    </div>
                  ) : (
                    history.map(b => renderBookingCard(b, true))
                  )}
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        )}
      </div>

      <ReviewModal 
        booking={reviewBooking}
        isOpen={!!reviewBooking}
        onClose={() => setReviewBooking(null)}
        onSuccess={() => setReviewBooking(null)}
      />
    </PageContainer>
  );
};

export default MyBookings;

