import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import QRCode from 'react-qr-code';
import { Flag, MapPin, Navigation, Sun } from 'lucide-react';
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

/** Ingresso em tela cheia: sobe de baixo, com o QR grande para o check-in */
export function TicketSheet({ booking, onClose }: { booking: TicketBooking | null; onClose: () => void }) {
  const s = booking?.session;
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

            {/* QR grande sobre fundo branco (leitura de qualquer câmera) */}
            <div className="mx-auto w-fit rounded-3xl bg-white p-4 shadow-[var(--shadow-2)]" aria-label="QR code de check-in">
              <QRCode value={`checkin:${booking.id}`} size={220} level="M" />
            </div>
            <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted pt-3">
              <Sun className="w-3.5 h-3.5" /> Mostre na entrada. Com o brilho da tela no máximo, lê mais rápido.
            </p>

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
