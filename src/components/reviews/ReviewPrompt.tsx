import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Star } from 'lucide-react';
import { whenLabel } from '@riff/core/lib/dates';
import { useBookings } from '@/hooks/useBookings';
import { canReview, sessionEnd } from '@/lib/reviews';

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** Convite "Como foi?" para as atividades da última semana ainda sem avaliação (some quando não há). */
export function ReviewPrompt({ max = 2, className }: { max?: number; className?: string }) {
  const { bookings } = useBookings();
  const [now] = useState(() => Date.now());
  const pending = (bookings ?? []).filter((b) => canReview(b, now) && now - sessionEnd(b.session).getTime() < WEEK);
  if (!pending.length) return null;

  return (
    <div className={className}>
      <div className="space-y-2">
        {pending.slice(0, max).map((b) => (
          <Link
            key={b.id}
            to={`/avaliar/${b.id}`}
            className="flex items-center gap-3 rounded-2xl border border-brand/60 bg-surface px-4 py-3 active:scale-[.98] transition-transform"
          >
            <span className="w-10 h-10 rounded-xl bg-brand/15 text-brand flex items-center justify-center shrink-0">
              <Star className="w-5 h-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink line-clamp-2">
                Como foi {b.session.title} {whenLabel(b.session.date)}?
              </span>
              <span className="block text-xs text-ink-muted">Leva 20 segundos · ajuda {b.professional?.full_name?.split(' ')[0] ?? 'o organizador'}</span>
            </span>
            <span className="text-xs font-bold text-brand flex items-center">
              Avaliar <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
