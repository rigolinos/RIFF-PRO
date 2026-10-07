import { useState } from 'react';
import QRCode from 'react-qr-code';
import { Copy, CheckCircle2, MessageCircle, Loader2, Calendar, Map } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '@riff/core/supabase/client';
import { BRAND } from '@/brand';
import { errorMessage } from '@riff/core/lib/utils';
import { buildPixPayload } from '@/lib/pix';
import { bookingAttribution, type BookingScreen } from '@riff/core/lib/attribution';
import { useAuth } from '@riff/core/hooks/useAuth';
import { useProfile } from '@riff/core/hooks/useProfile';
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

interface PaymentInfo {
  pix_key: string | null;
  pix_key_type: string | null;
  whatsapp_number: string | null;
  pro_name: string | null;
}

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
  const { profile: studentProfile } = useProfile();

  // Steps: 'resume' -> 'payment' -> 'ticket'
  const [step, setStep] = useState<'resume' | 'payment' | 'ticket'>('resume');
  const [isBooking, setIsBooking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [showArrowAnimation, setShowArrowAnimation] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);



  if (!session) return null;

  const isFree = session.price_per_slot === 0;
  const pixPayload = paymentInfo?.pix_key
    ? buildPixPayload({
        key: paymentInfo.pix_key,
        keyType: paymentInfo.pix_key_type,
        amount: session.price_per_slot,
        name: paymentInfo.pro_name,
        city: session.city,
      })
    : null;
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

      if (error) throw error;

      const response = data as { success: boolean; code: string; booking_id?: string };
      if (response.booking_id) setBookingId(response.booking_id);

      if (!response.success) {
        const message = ERROR_MESSAGES[response.code] || 'Erro ao processar reserva.';
        toast.error(message);
        onClose();
        return;
      }

      // Fetch payment info securely via RPC
      if (!isFree && response.booking_id) {
        const { data: pInfo } = await supabase.rpc('get_booking_payment_info', {
          p_booking_id: response.booking_id,
        });
        setPaymentInfo(pInfo as unknown as PaymentInfo);
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

  const handleCopyPix = () => {
    if (!pixPayload) {
      toast.error('Chave Pix não encontrada.');
      return;
    }

    navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    toast.success('Pix copia e cola copiado!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsApp = () => {
    const proPhone = paymentInfo?.whatsapp_number;
    if (!proPhone) {
      toast.error('O organizador não cadastrou o WhatsApp.');
      triggerSuccess();
      return;
    }

    const cleanPhone = proPhone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const studentName = studentProfile?.full_name?.split(' ')[0] || 'Participante';
    const proName = paymentInfo?.pro_name?.split(' ')[0];
    const text = encodeURIComponent(
      `${proName ? `Olá ${proName}!` : 'Olá!'} Aqui é o(a) ${studentName}. ` +
      `Acabei de reservar a atividade "${session.title}" pelo ${BRAND.name}. ` +
      `Segue o comprovante do Pix!`
    );

    window.open(`https://wa.me/${finalPhone}?text=${text}`, '_blank');
    triggerSuccess();
  };

  const generateMapsLink = () => {
    const q = encodeURIComponent(session.location_address || session.location_name);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  };

  const generateCalendarLink = () => {
    // Generate an ICS or Google Calendar link
    const text = encodeURIComponent(`Atividade: ${session.title}`);
    const details = encodeURIComponent(`Local: ${session.location_name}\n\nReservado via ${BRAND.name}`);
    const location = encodeURIComponent(session.location_address || session.location_name);
    // Simple Google Calendar link
    
    // Simplified format for demo
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}`, '_blank');
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
                  <DrawerTitle className="font-display text-xl text-ink">Resumo da Reserva</DrawerTitle>
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
                    {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirmar Reserva'}
                  </Button>
                  <Button variant="secondary" size="lg" onClick={onClose} disabled={isBooking}>
                    Cancelar
                  </Button>
                </DrawerFooter>
              </motion.div>
            )}

            {step === 'payment' && paymentInfo?.pix_key && (
              <motion.div 
                key="payment"
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
              >
                <DrawerHeader className="pb-2">
                  <DrawerTitle className="font-display text-xl text-ink">Pagamento via Pix</DrawerTitle>
                  <DrawerDescription className="text-ink-muted">
                    Sua vaga está pré-reservada. Efetue o pagamento.
                  </DrawerDescription>
                </DrawerHeader>

                <div className="p-6 space-y-6">
                  <div className="bg-surface border border-brand/30 rounded-2xl p-6 text-center">
                    <p className="text-sm text-ink-muted font-medium mb-1">Faça o Pix de</p>
                    <p className="font-display font-bold text-3xl text-ink mb-6">
                      R$ {session.price_per_slot.toFixed(2).replace('.', ',')}
                    </p>

                    <div className="flex justify-center mb-6">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <QRCode 
                          value={pixPayload ?? ''} 
                          size={160} 
                          bgColor="#FFFFFF"
                          fgColor="#000000"
                          level="M"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-ink-muted font-medium text-left ml-1">Pix copia e cola (valor já incluso):</p>
                      <div className="flex gap-2">
                        <div className="h-12 bg-elevated rounded-xl px-4 flex items-center flex-1 font-mono text-sm border border-line truncate select-all text-ink">
                          {pixPayload}
                        </div>
                        <Button
                          variant="primary"
                          onClick={handleCopyPix}
                          className="h-12 w-12 shrink-0 p-0"
                        >
                          {copied ? <CheckCircle2 className="w-5 h-5 text-bg" /> : <Copy className="w-5 h-5 text-bg" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-center text-ink-muted font-medium">
                      Após o pagamento, avise o organizador:
                    </p>
                    <Button
                      onClick={handleWhatsApp}
                      className="w-full h-14 bg-success hover:brightness-105 text-bg font-semibold text-lg rounded-xl gap-2 border-0"
                    >
                      <MessageCircle className="w-6 h-6" />
                      Enviar Comprovante
                    </Button>
                  </div>
                  
                  <div className="text-center">
                    <button 
                      onClick={triggerSuccess}
                      className="text-sm text-ink-muted hover:text-ink underline underline-offset-4"
                    >
                      Já paguei / Pagar depois
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'payment' && !paymentInfo?.pix_key && (
              <motion.div
                key="payment-no-pix"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <DrawerHeader className="pb-2">
                  <DrawerTitle className="font-display text-xl text-ink">Vaga pré-reservada</DrawerTitle>
                  <DrawerDescription className="text-ink-muted">
                    O organizador ainda não cadastrou a chave Pix. Combine o pagamento de{' '}
                    R$ {session.price_per_slot.toFixed(2).replace('.', ',')} direto com ele.
                  </DrawerDescription>
                </DrawerHeader>

                <div className="p-6 space-y-3">
                  {paymentInfo?.whatsapp_number && (
                    <Button
                      onClick={handleWhatsApp}
                      className="w-full h-14 bg-success hover:brightness-105 text-bg font-semibold text-lg rounded-xl gap-2 border-0"
                    >
                      <MessageCircle className="w-6 h-6" />
                      Falar com o organizador
                    </Button>
                  )}
                  <Button onClick={triggerSuccess} variant="outline" className="w-full h-12 rounded-xl">
                    Entendi
                  </Button>
                </div>
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

                  <p className="type-label text-brand mb-2">Seu Ingresso</p>
                  <h3 className="type-subtitle text-ink mb-1">{session.title}</h3>
                  <p className="text-ink-muted text-sm">
                    {dateStr} · {timeStr} · {session.location_name || 'A confirmar'}
                  </p>

                  {/* QR de check-in (o mesmo de Minhas reservas) */}
                  <div className="w-fit mx-auto my-6 p-2 bg-white rounded-xl" role="img" aria-label="QR de check-in">
                    <QRCode value={`checkin:${bookingId ?? session.id}`} size={104} level="L" />
                  </div>

                  <p className="text-ink-muted text-xs font-medium">
                    Mostre ao organizador na chegada
                  </p>
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
