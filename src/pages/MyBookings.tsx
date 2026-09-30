import { useState, useMemo } from 'react';
import { differenceInHours, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { MapPin, MessageCircle, XCircle, Loader2, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { PageContainer } from '@/components/layout/PageContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBookings } from '@/hooks/useBookings';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { useProfile } from '@/hooks/useProfile';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { supabase } from '@/integrations/supabase/client';

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

  const handleWhatsApp = async (booking: any) => {
    try {
      const { data: rawData, error } = await supabase.rpc('get_booking_payment_info', {
        p_booking_id: booking.id
      });
      
      type PaymentInfoResult = { whatsapp_number?: string; pix_key?: string; pro_name?: string };
      const data = rawData as unknown as PaymentInfoResult;

      if (error || !data?.whatsapp_number) {
        toast.error('O organizador não cadastrou o WhatsApp ou você não tem acesso.');
        return;
      }

      const proPhone = data.whatsapp_number;
      const url = buildWhatsAppUrl({
        phone: proPhone,
        studentName: profile?.full_name?.split(' ')[0] || 'Participante',
        proName: booking.professional?.full_name?.split(' ')[0] || 'Prof',
        sessionTitle: booking.session.category?.name || booking.session.title,
        sessionTime: booking.session.start_time.substring(0, 5),
      });

      window.open(url, '_blank');
    } catch {
      toast.error('Erro ao acessar o contato do organizador.');
    }
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
      toast.error('Faltam menos de 4 horas para a atividade. Entre em contato direto com o organizador para cancelar.');
      return;
    }

    if (!window.confirm('Tem certeza que deseja cancelar esta reserva?')) return;

    setCancelingId(booking.id);
    try {
      await cancelBooking(booking.id);
      toast.success('Reserva cancelada com sucesso.');
    } catch {
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

    if (effectiveStatus === 'cancelled_by_student') { statusText = 'Cancelada por você'; statusColor = 'text-danger bg-danger/15 border-danger'; }
    else if (effectiveStatus === 'cancelled_by_pro') { statusText = 'Atividade cancelada'; statusColor = 'text-danger bg-danger/15 border-danger'; }
    else if (effectiveStatus === 'completed') { statusText = 'Concluída'; statusColor = 'text-ink-muted bg-white/5 border-line'; }
    else if (booking.payment_status === 'pending') { statusText = 'Aguardando Pagamento'; statusColor = 'text-accent bg-accent/15 border-accent/20'; }
    else if (booking.payment_status === 'paid') { statusText = 'Confirmada'; statusColor = 'text-brand bg-brand/10 border-brand/20'; }
    else { statusText = effectiveStatus; statusColor = 'text-ink-muted bg-white/5 border-line'; }


    return (
      <div key={booking.id} className="bg-surface shadow-1 rounded-[24px] overflow-hidden flex flex-col mb-4 border border-line relative">
        {/* Ticket Header */}
        <div className="p-5 border-b border-dashed border-line relative">
          {/* Ticket notches */}
          <div className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-bg border-r border-t border-line transform rotate-45 z-10" />
          <div className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-bg border-l border-t border-line transform -rotate-45 z-10" />

          <div className="flex justify-between items-start mb-4">
            <div>
              <Badge variant="pill" className="mb-2 shadow-none border-line">{booking.session.category?.emoji} {booking.session.category?.name}</Badge>
              <h3 className="font-display font-bold text-xl text-ink leading-tight">
                {booking.session.title}
              </h3>
              <p className="text-sm text-ink-muted mt-1 font-medium">
                com {booking.professional?.full_name}
              </p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor} border-0 shadow-sm`}>
              {statusText}
            </span>
          </div>

          <div className="flex gap-4 items-center mt-2">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-ink-muted">
                <CalendarDays className="w-4 h-4" />
                <p className="text-sm font-semibold capitalize text-ink">{dateStr} • {timeStr}</p>
              </div>
              <div className="flex items-center gap-2 text-ink-muted">
                <MapPin className="w-4 h-4 shrink-0" />
                <p className="text-sm font-semibold truncate text-ink cursor-pointer hover:text-brand transition-colors" onClick={() => handleOpenMap(booking)}>
                  {booking.session.location_name}
                </p>
              </div>
            </div>
            
            {/* QR Code Mini for Ticket vibe */}
            {!isHistory && effectiveStatus !== 'cancelled_by_student' && effectiveStatus !== 'cancelled_by_pro' && (
              <div className="shrink-0 p-1.5 bg-white rounded-xl shadow-sm border border-line/50">
                <QRCode value={`checkin:${booking.id}`} size={64} level="L" />
              </div>
            )}
          </div>
        </div>

        {!isHistory ? (
          <div className="border-t border-line bg-line/20 p-3 flex gap-2">
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
              className="flex-1 h-10 rounded-lg bg-danger/15 text-danger hover:bg-danger/15 font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              {cancelingId === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Cancelar
            </button>
          </div>
        ) : (
          effectiveStatus === 'completed' && (
            <div className="border-t border-line bg-line/20 p-3 flex">
              <button
                onClick={() => setReviewBooking(booking)}
                className="flex-1 h-10 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                Avaliar Atividade
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
            <Loader2 className="w-8 h-8 text-brand animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="w-full bg-white/[0.05] border border-line h-12 rounded-xl mb-6 p-1">
              <TabsTrigger value="upcoming" className="flex-1 rounded-lg data-[state=active]:bg-brand data-[state=active]:text-brand-ink text-ink-muted font-medium transition-all">
                Próximas Atividades
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 rounded-lg data-[state=active]:bg-line data-[state=active]:text-ink text-ink-muted font-medium transition-all">
                Histórico
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="upcoming" className="mt-0">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {upcoming.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl mx-auto mb-4">📅</div>
                      <h3 className="text-lg font-semibold text-ink mb-1">Nenhuma atividade agendada</h3>
                      <p className="text-ink-muted text-sm">Que tal explorar novas turmas e agendar seu próximo treino?</p>
                    </div>
                  ) : (
                    upcoming.map(b => renderBookingCard(b, false))
                  )}
                </motion.div>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {history.length === 0 ? (
                    <div className="text-center py-12 text-ink-muted">
                      Seu histórico de atividades aparecerá aqui.
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

