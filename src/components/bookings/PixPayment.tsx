import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { Copy, Info, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';
import { Button } from '@riff/core/ui/button';
import { formatBRL } from '@riff/core/lib/money';
import { buildPixPayload } from '@/lib/pix';
import { paymentNoticeUrl, waPhone } from '@/lib/whatsapp';

type PaymentInfo = { pix_key: string | null; pix_key_type: string | null; whatsapp_number: string | null; pro_name: string | null };

export type PixActivity = { title: string; date: string; start_time: string; city?: string | null; price: number };

/**
 * Pagamento por Pix de uma reserva: QR com o valor, código para copiar e aviso no WhatsApp
 * de quem organiza. Usado logo depois de reservar e no "Pagar agora" da reserva pendente.
 */
export function PixPayment({ bookingId, activity, onNotified, onLater }: { bookingId: string; activity: PixActivity; onNotified: () => void; onLater: () => void }) {
  const { profile } = useProfile();
  const { data: info, isLoading } = useQuery({
    queryKey: ['booking-payment-info', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_booking_payment_info', { p_booking_id: bookingId });
      if (error) throw error;
      return data as unknown as PaymentInfo;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  const proFirst = info?.pro_name?.split(' ')[0] ?? null;
  const amount = formatBRL(activity.price);
  const payload = info?.pix_key
    ? buildPixPayload({ key: info.pix_key, keyType: info.pix_key_type, amount: activity.price, name: info.pro_name, city: activity.city })
    : null;

  const copy = async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      toast.success('Código Pix copiado. Cole no app do seu banco, em "Pix copia e cola".');
    } catch {
      toast.error('Não foi possível copiar. Use o QR Code.');
    }
  };

  const notify = () => {
    if (info?.whatsapp_number) {
      window.open(
        paymentNoticeUrl({
          phone: info.whatsapp_number,
          studentName: profile?.full_name?.split(' ')[0] || 'participante',
          proName: proFirst,
          title: activity.title,
          when: `${format(parseISO(activity.date), "EEE, d 'de' MMM", { locale: ptBR })} às ${activity.start_time.slice(0, 5)}`,
          amount,
        }),
        '_blank',
      );
    } else {
      toast.info('Quem organiza não cadastrou WhatsApp. O pagamento aparece para ele confirmar no app.');
    }
    onNotified();
  };

  if (!payload) {
    return (
      <div className="space-y-4">
        <p className="rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm text-ink leading-relaxed">
          {proFirst ?? 'Quem organiza'} ainda não cadastrou a chave Pix. Combine o pagamento de <strong>{amount}</strong> direto com {proFirst ? 'ele ou ela' : 'quem organiza'}.
        </p>
        {info?.whatsapp_number && (
          <Button size="lg" className="w-full bg-success text-bg hover:brightness-105" onClick={() => window.open(`https://wa.me/${waPhone(info.whatsapp_number!)}`, '_blank')}>
            <MessageCircle className="w-5 h-5 mr-2" /> Falar com {proFirst ?? 'quem organiza'}
          </Button>
        )}
        <Button size="lg" variant="secondary" className="w-full" onClick={onLater}>
          Entendi
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-surface border border-brand/30 rounded-2xl p-5 text-center space-y-4">
        <div>
          <p className="text-sm text-ink-muted">Faça um Pix de</p>
          <p className="font-display font-bold text-3xl text-ink">{amount}</p>
          {proFirst && <p className="text-xs text-ink-muted mt-1">para {info?.pro_name}</p>}
        </div>
        <div className="mx-auto w-fit p-3 bg-white rounded-xl" role="img" aria-label="QR Code do Pix com o valor">
          <QRCode value={payload} size={168} bgColor="#FFFFFF" fgColor="#000000" level="M" />
        </div>
        <Button variant="secondary" className="w-full" onClick={() => void copy()}>
          <Copy className="w-4 h-4 mr-2" /> Copiar código Pix (copia e cola)
        </Button>
      </div>

      <div className="space-y-2">
        <Button size="lg" className="w-full bg-success text-bg hover:brightness-105" onClick={notify}>
          <MessageCircle className="w-5 h-5 mr-2" /> Já fiz o Pix: avisar {proFirst ?? 'quem organiza'}
        </Button>
        <Button size="lg" variant="ghost" className="w-full" onClick={onLater}>
          Pago depois
        </Button>
      </div>

      <p className="flex items-start gap-2 text-xs text-ink-muted leading-relaxed">
        <Info className="w-4 h-4 text-brand shrink-0" />
        Sua vaga fica garantida quando {proFirst ?? 'quem organiza'} confirmar o pagamento. Até lá, ela aparece como "Aguardando pagamento" em Reservas, com o
        botão "Pagar agora".
      </p>
    </div>
  );
}
