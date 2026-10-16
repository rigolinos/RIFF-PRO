import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@riff/core/ui/drawer';
import { PixPayment, type PixActivity } from './PixPayment';

/** "Pagar agora": o Pix de uma reserva que ficou aguardando pagamento */
export function PaySheet({ booking, onClose }: { booking: { id: string; activity: PixActivity } | null; onClose: () => void }) {
  return (
    <Drawer open={!!booking} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-bg border-line pb-safe">
        {booking && (
          <div className="mx-auto w-full max-w-[420px] px-6 pb-8">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle className="type-title">Pagar sua reserva</DrawerTitle>
              <DrawerDescription className="text-sm text-ink-muted">{booking.activity.title}</DrawerDescription>
            </DrawerHeader>
            <PixPayment bookingId={booking.id} activity={booking.activity} onNotified={onClose} onLater={onClose} />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
