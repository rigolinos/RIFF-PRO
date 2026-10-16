import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Flag, MapPin, Navigation, UserCheck } from 'lucide-react';
import { useProfile } from '@riff/core/hooks/useProfile';
import { bookingCode, TICKET_HINT } from '@/lib/ticket';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@riff/core/ui/drawer';
import { SportIcon, StatusPill } from '@riff/core/domain';
import { googleMapsUrl } from '@riff/core/lib/geo';

export type TicketBooking = {
  id: string;
  status: string | null;
  payment_status: string | null;
  professional?: { full_name?: string | null } | null;
  session: {
    title: string;
    date: string;
    start_time: string;
    duration_minutes: number | null;
    location_name: string | null;
    location_address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    meeting_point?: string | null;
    category?: { slug?: string | null } | null;
  };
};

/** Ingresso em tela cheia: sobe de baixo, com o nome que está na lista e o código da reserva */
export function TicketSheet({ booking, onClose }: { booking: TicketBooking | null; onClose: () => void }) {
  const s = booking?.session;
  const { profile } = useProfile();
  const pending = booking?.payment_status === 'pending';
  return (
    <Drawer open={!!booking} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-bg border-line">
        {booking && s && (
          <div className="mx-auto w-full max-w-[420px] px-6 pb-8">
            <DrawerHeader className="px-0 text-center">
              <StatusPill
                text={pending ? 'Aguardando pagamento' : 'Reserva confirmada'}
                variant={pending ? 'alert' : 'success'}
                className="mx-auto"
              />
              <DrawerTitle className="type-title flex items-center justify-center gap-2 pt-2">
                <SportIcon slug={s.category?.slug} className="w-5 h-5 text-brand shrink-0" /> {s.title}
              </DrawerTitle>
              <DrawerDescription className="text-sm text-ink-muted">com {booking.professional?.full_name ?? 'o organizador'}</DrawerDescription>
            </DrawerHeader>

            <div className="rounded-3xl border-2 border-dashed border-brand bg-surface px-5 py-6 text-center">
              <UserCheck className="w-6 h-6 text-brand mx-auto" />
              <p className="type-label mt-2">Nome na lista</p>
              <p className="type-display text-ink break-words">{profile?.full_name ?? 'Você'}</p>
              <p className="text-sm text-ink-muted mt-1">Reserva {bookingCode(booking.id)}</p>
            </div>
            <p className="text-xs text-center text-ink-muted pt-3 leading-relaxed">{TICKET_HINT}</p>

            <div className="mt-5 grid grid-cols-2 divide-x divide-line rounded-2xl border border-dashed border-line">
              <div className="p-3 text-center">
                <p className="type-label">Dia</p>
                <p className="text-sm font-semibold text-ink first-letter:uppercase">{format(parseISO(s.date), "EEEE, d 'de' MMM", { locale: ptBR })}</p>
              </div>
              <div className="p-3 text-center">
                <p className="type-label">Horário</p>
                <p className="text-sm font-semibold text-ink">
                  {s.start_time.substring(0, 5)}
                  {s.duration_minutes ? ` · ${s.duration_minutes} min` : ''}
                </p>
              </div>
            </div>

            {s.location_name && (
              <a
                href={googleMapsUrl({ latitude: s.latitude, longitude: s.longitude, name: s.location_name, address: s.location_address })}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 active:bg-elevated"
              >
                <MapPin className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ink">{s.location_name}</span>
                  {s.meeting_point && (
                    <span className="flex items-center gap-1 text-xs text-ink-muted pt-0.5">
                      <Flag className="w-3.5 h-3.5 text-accent" /> {s.meeting_point}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-brand shrink-0">
                  <Navigation className="w-4 h-4" /> Como chegar
                </span>
              </a>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
