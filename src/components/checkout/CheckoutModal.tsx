import { useState } from 'react';
import { Loader2, Calendar, Map } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '@riff/core/supabase/client';
import { BRAND } from '@/brand';
import { errorMessage } from '@riff/core/lib/utils';
import { PixPayment } from '@/components/bookings/PixPayment';
import { bookingCode, TICKET_HINT } from '@/lib/ticket';
import { useProfile } from '@riff/core/hooks/useProfile';
import { googleMapsUrl } from '@riff/core/lib/geo';
import { googleCalendarUrl } from '@riff/core/lib/calendar';
import { bookingAttribution, type BookingScreen } from '@riff/core/lib/attribution';
import { useAuth } from '@riff/core/hooks/useAuth';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@riff/core/ui/drawer';
import { Button } from '@riff/core/ui/button';
import { SportIcon } from '@riff/core/domain/SportIcon';

// Map server error codes to pt-BR messages
const ERROR_MESSAGES: Record<string, string> = {
  unauthenticated: 'Você precisa estar logado para reservar.',
  profile_not_found: 'Perfil não encontrado. Faça login novamente.',
  session_not_found: 'Atividade não encontrada.',
  session_unavailable: 'Esta atividade não está mais disponível.',
  session_started: 'Esta atividade já começou.',
  session_full: 'Não há mais vagas disponíveis.',
  self_booking: 'Você não pode reservar sua própria atividade.',
  already_booked: 'Você já reservou esta atividade.',
};

import type { Tables } from '@riff/core/supabase/types';

interface CheckoutModalProps {
  session: Tables<'sessions'> & {
    professional?: { id: string; full_name: string | null; avatar_url: string | null; public_slug: string | null; } | null;
    category?: { name: string; emoji: string | null; slug: string | null; } | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Tela onde a reserva foi aberta (usada para registrar a origem). */
  screen: BookingScreen;
}

export const CheckoutModal = ({ session, isOpen, onClose, onSuccess, screen }: CheckoutModalProps) => {
  const { user } = useAuth();
  const { profile } = useProfile();

  // Steps: 'resume' -> 'payment' -> 'ticket'
  const [step, setStep] = useState<'resume' | 'payment' | 'ticket'>('resume');
  const [isBooking, setIsBooking] = useState(false);
  const [showArrowAnimation, setShowArrowAnimation] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);



  if (!session) return null;

  const isFree = session.price_per_slot === 0;
  const dateStr = format(parseISO(session.date), "EEE, d 'de' MMM", { locale: ptBR });
  const timeStr = session.start_time.substring(0, 5);

  const handleBook = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para reservar.');
      return;
    }

    setIsBooking(true);
    try {
      const { source, attribution } = bookingAttribution(screen, session);
      const { data, error } = await supabase.rpc('create_booking', {
        p_session_id: session.id,
        p_source: source,
        p_attribution: attribution,
      });

      // bloqueio entre a pessoa e quem organiza (de qualquer lado): mensagem neutra, sem dizer quem bloqueou
      if (error?.message.includes('blocked')) {
        toast.error('Esta atividade não está disponível para você.');
        onClose();
        return;
      }
      if (error) throw error;

      const response = data as { success: boolean; code: string; booking_id?: string };
      if (response.booking_id) setBookingId(response.booking_id);

      if (!response.success) {
        const message = ERROR_MESSAGES[response.code] || 'Erro ao processar reserva.';
        toast.error(message);
        onClose();
        return;
      }

      // Atividade paga: o Pix vem em seguida (o bloco de pagamento busca a chave de quem organiza)
      if (!isFree && response.booking_id) {
        setStep('payment');
      } else {
        triggerSuccess();
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Erro ao processar reserva.'));
    } finally {
      setIsBooking(false);
    }
  };

  const triggerSuccess = () => {
    setStep('ticket');
    setShowArrowAnimation(true);
    onSuccess();
    // The arrow animation plays once when entering the ticket step
  };

  // Como chegar: ponto exato quando o organizador marcou, senão o endereço escrito
  const generateMapsLink = () => {
    window.open(
      googleMapsUrl({ latitude: session.latitude, longitude: session.longitude, name: session.location_name, address: session.location_address }),
      '_blank',
    );
  };

  const generateCalendarLink = () => {
    window.open(
      googleCalendarUrl({
        title: session.title,
        date: session.date,
        start_time: session.start_time,
        duration_minutes: session.duration_minutes,
        location: [session.location_name, session.location_address].filter(Boolean).join(', '),
        details: [session.meeting_point ? `Ponto de encontro: ${session.meeting_point}` : null, `Reservado pelo ${BRAND.name}: ${window.location.origin}/session/${session.id}`]
          .filter(Boolean)
          .join('\n'),
      }),
      '_blank',
    );
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-bg border-line pb-safe">
        <div className="max-w-md w-full mx-auto">
          <AnimatePresence mode="wait">
            
            {step === 'resume' && (
              <motion.div 
                key="resume"
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
              >
                <DrawerHeader>
                  <DrawerTitle className="font-display text-xl text-ink">Resumo da reserva</DrawerTitle>
                  <DrawerDescription className="text-ink-muted">
                    Revise os detalhes da sua vaga.
                  </DrawerDescription>
                </DrawerHeader>

                <div className="p-5 space-y-4">
                  <div className="bg-surface border border-line rounded-2xl p-4 flex gap-4 items-center shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-brand/15 text-brand flex items-center justify-center shrink-0">
                      <SportIcon slug={session.category?.slug} className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="type-title">{session.title}</h3>
                      <p className="text-sm text-ink-muted mt-1">
                        {dateStr} · {timeStr}
                      </p>
                    </div>
                  </div>

                  <div className="bg-surface border border-line rounded-2xl p-4 flex justify-between items-center shadow-sm">
                    <span className="text-ink-muted font-medium">Total a pagar</span>
                    <span className="type-subtitle text-accent">
                      {isFree ? 'Gratuito' : `R$ ${session.price_per_slot.toFixed(2).replace('.', ',')}`}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    A atividade é de responsabilidade do organizador.{!isFree && ' O pagamento vai direto para ele, e reembolsos são tratados com ele.'}
                  </p>
                </div>

                <DrawerFooter className="pt-2">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={handleBook}
                    disabled={isBooking}
                    className="w-full shadow-[var(--shadow-cta)]"
                  >
                    {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirmar reserva'}
                  </Button>
                  <Button variant="secondary" size="lg" onClick={onClose} disabled={isBooking}>
                    Cancelar
                  </Button>
                </DrawerFooter>
              </motion.div>
            )}

            {step === 'payment' && bookingId && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="px-6 pb-6"
              >
                <DrawerHeader className="px-0 pb-2">
                  <DrawerTitle className="font-display text-xl text-ink">Vaga pré-reservada: falta o Pix</DrawerTitle>
                  <DrawerDescription className="text-ink-muted">O pagamento vai direto para quem organiza.</DrawerDescription>
                </DrawerHeader>
                <PixPayment
                  bookingId={bookingId}
                  activity={{ title: session.title, date: session.date, start_time: session.start_time, city: session.city, price: session.price_per_slot }}
                  onNotified={triggerSuccess}
                  onLater={triggerSuccess}
                />
              </motion.div>
            )}

            {step === 'ticket' && (
              <motion.div 
                key="ticket"
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 pt-8"
              >
                <div className="text-center mb-6">
                  <h2 className="type-title text-ink">{isFree ? 'Reserva confirmada' : 'Vaga pré-reservada até o pagamento'}</h2>
                  <p className="text-ink-muted text-sm mt-1">
                    {isFree ? 'Sua vaga está garantida!' : 'Sua vaga fica garantida quando o organizador confirmar o Pix.'}
                  </p>
                </div>

                {/* Ticket Component */}
                <div className="relative border-2 border-dashed border-brand rounded-3xl p-6 text-center bg-surface mb-6 overflow-hidden">
                  {/* Arrow Animation */}
                  {showArrowAnimation && (
                    <motion.div 
                      initial={{ x: '-100%', opacity: 0 }}
                      animate={{ x: '100%', opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                      className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-1 z-10 pointer-events-none"
                    >
                      <div className="relative w-1/2 h-full bg-gradient-to-r from-transparent to-brand">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-brand border-b-[4px] border-b-transparent" />
                      </div>
                    </motion.div>
                  )}

                  <p className="type-label text-brand mb-2">Seu ingresso</p>
                  <h3 className="type-subtitle text-ink mb-1">{session.title}</h3>
                  <p className="text-ink-muted text-sm">
                    {dateStr} · {timeStr} · {session.location_name || 'A confirmar'}
                  </p>

                  {/* Nome e código: é assim que quem organiza acha a pessoa na lista */}
                  <div className="my-5 rounded-2xl bg-elevated border border-line px-4 py-3">
                    <p className="type-label">Nome na lista</p>
                    <p className="type-title text-ink">{profile?.full_name ?? 'Você'}</p>
                    {bookingId && <p className="text-xs text-ink-muted mt-0.5">Reserva {bookingCode(bookingId)}</p>}
                  </div>

                  <p className="text-ink-muted text-xs">{TICKET_HINT}</p>
                </div>

                <div className="flex gap-3 mb-4">
                  <Button variant="primary" className="flex-1 shadow-[var(--shadow-cta)]" onClick={generateMapsLink}>
                    <Map className="w-4 h-4 mr-2" />
                    Ver rota
                  </Button>
                  <Button variant="secondary" className="flex-1" onClick={generateCalendarLink}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Calendário
                  </Button>
                </div>
                
                <Button variant="ghost" className="w-full" onClick={onClose}>
                  Fechar
                </Button>
              </motion.div>
            )}
            
          </AnimatePresence>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
