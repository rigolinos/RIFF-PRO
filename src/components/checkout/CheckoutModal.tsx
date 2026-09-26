import { useState } from 'react';
import { Copy, CheckCircle2, MessageCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

interface CheckoutModalProps {
  session: any; // O objeto da sessão vindo do Feed
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

  if (!session) return null;

  const handleBook = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para reservar.');
      return;
    }

    setIsBooking(true);
    try {
      // Chama a RPC que criamos no banco
      const { data, error } = await supabase.rpc('create_booking', {
        p_session_id: session.id,
        p_student_user_id: user.id
      });

      if (error) throw error;
      
      const response = data as { success: boolean; message: string; booking_id?: string };
      
      if (!response.success) {
        toast.error(response.message);
        onClose();
        return;
      }

      setIsConfirmed(true);
      onSuccess(); // Dá trigger de re-fetch no feed para atualizar vagas
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar reserva');
    } finally {
      setIsBooking(false);
    }
  };

  const handleCopyPix = () => {
    const pixKey = session.professional?.profiles?.pix_key || session.professional?.pix_key; // Ajuste dependendo do join
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
    const proPhone = session.professional?.whatsapp_number || session.professional?.phone;
    if (!proPhone) {
      toast.error('O profissional não cadastrou o WhatsApp.');
      return;
    }

    const url = buildWhatsAppUrl({
      phone: proPhone,
      studentName: studentProfile?.full_name?.split(' ')[0] || 'Aluno',
      proName: session.professional?.full_name?.split(' ')[0] || 'Prof',
      sessionTitle: session.category?.name || session.title,
      sessionTime: session.start_time.substring(0, 5),
    });

    window.open(url, '_blank');
    onClose();
  };

  const proPixKey = session.professional?.pix_key;
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
                    <h4 className="font-semibold text-foreground">{session.title}</h4>
                    <p className="text-sm text-muted-foreground">Com {session.professional?.full_name}</p>
                    <p className="text-sm text-emerald-400 font-medium mt-1">
                      {isFree ? 'Gratuito' : `R$ ${session.price_per_slot.toFixed(2).replace('.', ',')}`}
                    </p>
                  </div>
                </div>
              </div>

              <DrawerFooter>
                <Button 
                  onClick={handleBook} 
                  disabled={isBooking}
                  className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-lg rounded-xl glow-emerald"
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
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <DrawerTitle className="text-2xl text-emerald-400">Vaga Garantida!</DrawerTitle>
                <DrawerDescription className="text-base mt-2">
                  Sua reserva foi registrada no sistema.
                </DrawerDescription>
              </DrawerHeader>

              {!isFree && (
                <div className="p-6 space-y-6">
                  <div className="bg-white/5 rounded-2xl p-5 border border-emerald-500/20 text-center space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0 opacity-50" />
                    
                    <p className="text-sm text-muted-foreground">Faça o Pix de</p>
                    <p className="text-3xl font-bold text-foreground">
                      R$ {session.price_per_slot.toFixed(2).replace('.', ',')}
                    </p>
                    
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-2">Chave Pix do Profissional:</p>
                      <div className="flex gap-2">
                        <div className="h-12 bg-black/40 rounded-xl px-4 flex items-center flex-1 font-mono text-sm border border-white/10 truncate select-all">
                          {proPixKey || 'Chave não cadastrada'}
                        </div>
                        <Button 
                          onClick={handleCopyPix}
                          className="h-12 w-12 shrink-0 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl"
                        >
                          {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-center text-muted-foreground">
                      Após o pagamento, avise o profissional:
                    </p>
                    <Button 
                      onClick={handleWhatsApp}
                      className="w-full h-14 bg-[#25D366] hover:bg-[#20bd5a] text-black font-semibold text-lg rounded-xl shadow-[0_8px_30px_rgba(37,211,102,0.3)] gap-2"
                    >
                      <MessageCircle className="w-6 h-6" />
                      Enviar Comprovante
                    </Button>
                  </div>
                </div>
              )}

              {isFree && (
                <div className="p-6">
                  <Button 
                    onClick={onClose}
                    className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-lg rounded-xl glow-emerald"
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
