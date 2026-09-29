import { useState } from 'react';
import QRCode from 'react-qr-code';
import { Copy, CheckCircle2, MessageCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

// Map server error codes to pt-BR messages
const ERROR_MESSAGES: Record<string, string> = {
  unauthenticated: 'Você precisa estar logado para reservar.',
  profile_not_found: 'Perfil não encontrado. Faça login novamente.',
  session_not_found: 'Aula não encontrada.',
  session_unavailable: 'Esta aula não está mais disponível.',
  session_started: 'Esta aula já começou.',
  session_full: 'Não há mais vagas disponíveis.',
  self_booking: 'Você não pode reservar sua própria aula.',
  already_booked: 'Você já reservou esta aula.',
};

interface PaymentInfo {
  pix_key: string | null;
  pix_key_type: string | null;
  whatsapp_number: string | null;
  pro_name: string | null;
}

interface CheckoutModalProps {
  session: {
    id: string;
    title: string;
    price_per_slot: number;
    category?: { emoji?: string | null; name?: string | null } | null;
    professional?: { full_name?: string | null } | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CheckoutModal = ({ session, isOpen, onClose, onSuccess }: CheckoutModalProps) => {
  const { user } = useAuth();
  const { profile: studentProfile } = useProfile();

  const [isBooking, setIsBooking] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);

  if (!session) return null;

  const handleBook = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para reservar.');
      return;
    }

    setIsBooking(true);
    try {
      // Call the new RPC without user_id — server resolves from auth.uid()
      const { data, error } = await supabase.rpc('create_booking', {
        p_session_id: session.id,
      });

      if (error) throw error;

      const response = data as { success: boolean; code: string; booking_id?: string };

      if (!response.success) {
        const message = ERROR_MESSAGES[response.code] || 'Erro ao processar reserva.';
        toast.error(message);
        onClose();
        return;
      }

      // Fetch payment info securely via RPC
      if (session.price_per_slot > 0 && response.booking_id) {
        const { data: pInfo } = await supabase.rpc('get_booking_payment_info', {
          p_booking_id: response.booking_id,
        });
        setPaymentInfo(pInfo as unknown as PaymentInfo);
      }

      setIsConfirmed(true);
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao processar reserva';
      toast.error(message);
    } finally {
      setIsBooking(false);
    }
  };

  const handleCopyPix = () => {
    const pixKey = paymentInfo?.pix_key;
    if (!pixKey) {
      toast.error('Chave Pix não encontrada.');
      return;
    }

    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    toast.success('Chave Pix copiada!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsApp = () => {
    const proPhone = paymentInfo?.whatsapp_number;
    if (!proPhone) {
      toast.error('O profissional não cadastrou o WhatsApp.');
      return;
    }

    const cleanPhone = proPhone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const studentName = studentProfile?.full_name?.split(' ')[0] || 'Aluno';
    const proName = paymentInfo?.pro_name?.split(' ')[0] || 'Prof';
    const text = encodeURIComponent(
      `Olá ${proName}! Aqui é o(a) ${studentName}. ` +
      `Acabei de reservar a aula "${session.category?.name || session.title}" pelo Riff Pro. ` +
      `Segue o comprovante do Pix!`
    );

    window.open(`https://wa.me/${finalPhone}?text=${text}`, '_blank');
    onClose();
  };

  const isFree = session.price_per_slot === 0;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="pb-4">
        <div className="max-w-md w-full mx-auto pb-safe">

          {!isConfirmed ? (
            <>
              <DrawerHeader>
                <DrawerTitle className="text-xl">Confirmar Reserva</DrawerTitle>
                <DrawerDescription>
                  Revise os detalhes da sua vaga.
                </DrawerDescription>
              </DrawerHeader>

              <div className="p-4 space-y-4">
                <div className="glass-card p-4 flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">
                    {session.category?.emoji || '🤸'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-ink">{session.title}</h4>
                    <p className="text-sm text-ink-muted">Com {session.professional?.full_name}</p>
                    <p className="text-sm text-brand font-medium mt-1">
                      {isFree ? 'Gratuito' : `R$ ${session.price_per_slot.toFixed(2).replace('.', ',')}`}
                    </p>
                  </div>
                </div>
              </div>

              <DrawerFooter>
                <Button
                  onClick={handleBook}
                  disabled={isBooking}
                  className="w-full h-14 bg-brand hover:bg-brand text-brand-ink font-semibold text-lg rounded-xl glow-emerald"
                >
                  {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Garantir Vaga'}
                </Button>
                <Button variant="ghost" onClick={onClose} disabled={isBooking}>
                  Cancelar
                </Button>
              </DrawerFooter>
            </>
          ) : (
            <>
              <DrawerHeader className="text-center pb-2">
                <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-brand" />
                </div>
                <DrawerTitle className="text-2xl text-brand">Vaga Garantida!</DrawerTitle>
                <DrawerDescription className="text-base mt-2">
                  Sua reserva foi registrada no sistema.
                </DrawerDescription>
              </DrawerHeader>

              {!isFree && paymentInfo?.pix_key && (
                <div className="p-6 space-y-6">
                  <div className="bg-white/5 rounded-2xl p-5 border border-brand/20 text-center space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand/0 via-brand to-brand/0 opacity-50" />

                    <p className="text-sm text-ink-muted">Faça o Pix de</p>
                    <p className="text-3xl font-bold text-ink">
                      R$ {session.price_per_slot.toFixed(2).replace('.', ',')}
                    </p>

                    <div className="flex justify-center py-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm border border-line/50">
                        <QRCode 
                          value={paymentInfo.pix_key} 
                          size={160} 
                          bgColor="#FFFFFF"
                          fgColor="#000000"
                          level="M"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="text-xs text-ink-muted mb-2">Ou copie a Chave Pix:</p>
                      <div className="flex gap-2">
                        <div className="h-12 bg-surface rounded-xl px-4 flex items-center flex-1 font-mono text-sm border border-line truncate select-all">
                          {paymentInfo.pix_key}
                        </div>
                        <Button
                          onClick={handleCopyPix}
                          className="h-12 w-12 shrink-0 bg-brand text-brand-ink hover:bg-brand/90 rounded-xl"
                        >
                          {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-center text-ink-muted">
                      Após o pagamento, avise o profissional:
                    </p>
                    <Button
                      onClick={handleWhatsApp}
                      className="w-full h-14 bg-[#25D366] hover:bg-[#20bd5a] text-brand-ink font-semibold text-lg rounded-xl shadow-[0_8px_30px_rgba(37,211,102,0.3)] gap-2"
                    >
                      <MessageCircle className="w-6 h-6" />
                      Enviar Comprovante
                    </Button>
                  </div>
                </div>
              )}

              {(isFree || !paymentInfo?.pix_key) && (
                <div className="p-6">
                  <Button
                    onClick={onClose}
                    className="w-full h-14 bg-brand hover:bg-brand text-brand-ink font-semibold text-lg rounded-xl glow-emerald"
                  >
                    Voltar ao Feed
                  </Button>
                </div>
              )}
            </>
          )}

        </div>
      </DrawerContent>
    </Drawer>
  );
};
