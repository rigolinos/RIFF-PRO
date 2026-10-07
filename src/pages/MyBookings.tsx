import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { differenceInHours, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, MessageCircle, XCircle, Loader2, CalendarDays, Star } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { HeroHeader } from '@riff/core/layout/HeroHeader';
import { EmptyState, SportIcon, StatusPill, TicketGrid } from '@riff/core/domain';
import { ConfirmDialog } from '@riff/core/domain/ConfirmDialog';
import { formatBRL } from '@riff/core/lib/money';
import { googleMapsUrl } from '@riff/core/lib/geo';
import { useBookings } from '@/hooks/useBookings';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { useProfile } from '@riff/core/hooks/useProfile';
import { ReviewPrompt } from '@/components/reviews/ReviewPrompt';
import { canReview } from '@/lib/reviews';
import { supabase } from '@riff/core/supabase/client';

type BookingType = NonNullable<ReturnType<typeof useBookings>['bookings']>[number];

const MyBookings = () => {
  const { profile } = useProfile();
  const { bookings, isLoading, isError, error, cancelBooking } = useBookings();
  if (isError && error) console.error('Error fetching bookings:', error);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<BookingType | null>(null);
  const [now] = useState(() => Date.now());
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const navigate = useNavigate();

  // Split bookings between upcoming and history
  const { upcoming, history } = useMemo(() => {
    if (!bookings) return { upcoming: [], history: [] };

    const now = new Date();
    const up: BookingType[] = [];
    const hist: BookingType[] = [];

    bookings.forEach((booking) => {
      // Check if session date + time is in the future and not cancelled
      const sessionDate = parseISO(`${booking.session.date}T${booking.session.start_time}`);
      const isFuture = sessionDate > now;
      const isActive = (booking.status || '') === 'pending' || (booking.status || '') === 'confirmed';

      if (isFuture && isActive) {
        up.push(booking as unknown as BookingType);
      } else {
        hist.push(booking as unknown as BookingType);
      }
    });

    // Sort upcoming (soonest first)
    up.sort((a, b) => {
      return new Date(`${a.session.date}T${a.session.start_time}`).getTime() - 
             new Date(`${b.session.date}T${b.session.start_time}`).getTime();
    });

    return { upcoming: up, history: hist };
  }, [bookings]);

  const handleWhatsApp = async (booking: BookingType) => {
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
        proName: booking.professional?.full_name?.split(' ')[0],
        sessionTitle: booking.session.category?.name || booking.session.title,
        sessionTime: booking.session.start_time.substring(0, 5),
      });

      window.open(url, '_blank');
    } catch {
      toast.error('Erro ao acessar o contato do organizador.');
    }
  };

  // Como chegar: ponto exato quando o organizador marcou, senão o endereço escrito
  const handleOpenMap = (booking: BookingType) => {
    const s = booking.session;
    window.open(googleMapsUrl({ latitude: s.latitude, longitude: s.longitude, name: s.location_name, address: s.location_address }), '_blank');
  };

  const handleCancel = async (booking: BookingType) => {
    const sessionDate = parseISO(`${booking.session.date}T${booking.session.start_time}`);
    const hoursDifference = differenceInHours(sessionDate, new Date());

    if (hoursDifference < 4) {
      toast.error('Faltam menos de 4 horas para a atividade. Entre em contato direto com o organizador para cancelar.');
      return;
    }

    setBookingToCancel(booking);
  };

  const confirmCancel = async () => {
    const booking = bookingToCancel;
    if (!booking) return;
    setCancelingId(booking.id);
    try {
      await cancelBooking(booking.id);
      toast.success('Reserva cancelada com sucesso.');
    } catch {
      toast.error('Erro ao cancelar reserva.');
    } finally {
      setCancelingId(null);
      setBookingToCancel(null);
    }
  };

  // Situação da reserva para o selo
  const statusOf = (booking: BookingType) => {
    const isPast = parseISO(`${booking.session.date}T${booking.session.start_time}`) < new Date();
    const status = booking.status || '';
    const effective = isPast && !status.startsWith('cancelled') ? 'completed' : status;
    if (effective === 'cancelled_by_student') return { text: 'Cancelada por você', variant: 'danger' as const, effective };
    if (effective === 'cancelled_by_pro') return { text: 'Atividade cancelada', variant: 'danger' as const, effective };
    if (effective === 'completed') return { text: 'Concluída', variant: 'neutral' as const, effective };
    if (booking.payment_status === 'pending') return { text: 'Aguardando pagamento', variant: 'alert' as const, effective };
    if (booking.payment_status === 'paid' || booking.payment_status === 'free') return { text: 'Confirmada', variant: 'success' as const, effective };
    return { text: effective, variant: 'neutral' as const, effective };
  };

  const renderBookingCard = (booking: BookingType, isHistory: boolean = false) => {
    const sessionDate = parseISO(booking.session.date);
    const st = statusOf(booking);
    const cancelled = st.effective === 'cancelled_by_student' || st.effective === 'cancelled_by_pro';
    const category = booking.session.category as { name?: string; slug?: string | null } | null;

    return (
      <div key={booking.id} className="bg-surface rounded-2xl overflow-hidden border border-line">
        <Link to={`/session/${booking.session.id}`} className="block p-4 space-y-1 active:bg-elevated">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink min-w-0">
              <SportIcon slug={category?.slug} className="w-4 h-4 text-brand shrink-0" />
              <span className="truncate">{booking.session.title}</span>
            </p>
            <StatusPill text={st.text} variant={st.variant} className="shrink-0" />
          </div>
          <p className="text-xs text-ink-muted">com {booking.professional?.full_name ?? 'organizador'}</p>
        </Link>

        {/* Ingresso: dia, horário e QR de check-in */}
        <div className="grid grid-cols-[1fr_1fr_auto] items-center divide-x divide-line border-t border-dashed border-line">
          <div className="p-3 text-center">
            <p className="type-label">{format(sessionDate, 'EEEEEE', { locale: ptBR })}</p>
            <p className="type-title leading-tight">{format(sessionDate, 'd')}</p>
            <p className="text-xs text-ink-muted">{format(sessionDate, 'MMM', { locale: ptBR })}</p>
          </div>
          <div className="p-3 text-center">
            <p className="type-label">Horário</p>
            <p className="type-title leading-tight">{booking.session.start_time.substring(0, 5)}</p>
            <p className="text-xs text-ink-muted">{booking.session.duration_minutes ? `${booking.session.duration_minutes} min` : ''}</p>
          </div>
          {!isHistory && !cancelled ? (
            <div className="p-3">
              <div className="p-1.5 bg-white rounded-xl" aria-label="QR code de check-in">
                <QRCode value={`checkin:${booking.id}`} size={56} level="L" />
              </div>
            </div>
          ) : (
            <div className="p-3 text-center min-w-[80px]">
              <p className="type-label">Valor</p>
              <p className="text-sm font-bold text-ink">{Number(booking.amount_total ?? 0) > 0 ? formatBRL(booking.amount_total) : 'Grátis'}</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleOpenMap(booking)}
          className="w-full flex items-center gap-2 border-t border-line px-4 py-2.5 text-left text-xs text-ink-muted active:bg-elevated"
        >
          <MapPin className="w-4 h-4 shrink-0 text-brand" />
          <span className="truncate flex-1">
            {booking.session.location_name}
            {booking.session.meeting_point ? ` · ${booking.session.meeting_point}` : ''}
          </span>
          <span className="text-brand font-semibold">Como chegar</span>
        </button>

        {!isHistory ? (
          <div className="border-t border-line p-3 flex gap-2">
            <button
              type="button"
              onClick={() => handleWhatsApp(booking)}
              className="flex-1 h-10 rounded-xl bg-success/15 text-success font-medium text-sm flex items-center justify-center gap-2 active:scale-[.98]"
            >
              <MessageCircle className="w-4 h-4" /> Falar com o organizador
            </button>
            <button
              type="button"
              onClick={() => handleCancel(booking)}
              disabled={cancelingId === booking.id}
              className="h-10 px-4 rounded-xl bg-danger/15 text-danger font-medium text-sm flex items-center justify-center gap-2 active:scale-[.98]"
            >
              {cancelingId === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Cancelar
            </button>
          </div>
        ) : (
          canReview(booking, now) && (
            <div className="border-t border-line p-3">
              <Link
                to={`/avaliar/${booking.id}`}
                className="w-full h-10 rounded-xl bg-brand/10 text-brand font-semibold text-sm flex items-center justify-center gap-2 active:scale-[.98]"
              >
                <Star className="w-4 h-4" /> Avaliar o organizador
              </Link>
            </div>
          )
        )}
      </div>
    );
  };

  const list = tab === 'upcoming' ? upcoming : history;

  return (
    <PageContainer withBottomNav>
      <HeroHeader overlap label="Reservas" title="Sua agenda" subtitle="Suas vagas confirmadas, o check-in e o histórico." />

      <TicketGrid
        items={[
          { label: 'Próximas', value: upcoming.length },
          { label: 'Concluídas', value: history.filter((b) => statusOf(b).effective === 'completed').length },
          { label: 'Canceladas', value: history.filter((b) => (b.status || '').startsWith('cancelled')).length },
        ]}
      />

      <div className="px-4 py-6 space-y-4">
        <ReviewPrompt />
        <div className="grid grid-cols-2 gap-1 bg-surface border border-line rounded-full p-1" role="tablist">
          {(['upcoming', 'history'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`h-9 rounded-full text-sm font-medium transition-colors ${tab === t ? 'bg-brand text-brand-ink font-semibold' : 'text-ink-muted'}`}
            >
              {t === 'upcoming' ? 'Próximas' : 'Histórico'}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-brand animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={tab === 'upcoming' ? 'Nenhuma reserva por enquanto' : 'Sem histórico ainda'}
            description={tab === 'upcoming' ? 'Veja o que vai rolar na sua cidade e garanta sua vaga.' : 'As atividades de que você participou aparecem aqui.'}
            action={{ label: 'Ver atividades', onClick: () => navigate('/feed') }}
          />
        ) : (
          <div className="space-y-3">{list.map((b) => renderBookingCard(b, tab === 'history'))}</div>
        )}
      </div>

      <ConfirmDialog
        open={!!bookingToCancel}
        onOpenChange={(open) => !open && setBookingToCancel(null)}
        title="Cancelar reserva?"
        description={bookingToCancel ? `Sua vaga em "${bookingToCancel.session.title}" será liberada para outra pessoa.` : ''}
        cancelLabel="Manter reserva"
        confirmLabel="Cancelar reserva"
        isDestructive
        isLoading={!!cancelingId}
        onConfirm={confirmCancel}
      />
    </PageContainer>
  );
};

export default MyBookings;
