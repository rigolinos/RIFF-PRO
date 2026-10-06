import { Link } from 'react-router-dom';
import { ChevronRight, Trophy } from 'lucide-react';
import { usePendingReviews } from '@/hooks/useSports';
import { whenLabel } from '@/lib/dates';
import { POINTS } from '@/lib/sports';

/** Convite para avaliar os jogos recentes (some quando não há pendências). */
export function ReviewPrompt({ max = 2, className }: { max?: number; className?: string }) {
  const { data: pending } = usePendingReviews();
  if (!pending?.length) return null;

  return (
    <div className={className}>
      <div className="space-y-2">
        {pending.slice(0, max).map((p) => (
          <Link
            key={p.session_id}
            to={`/avaliar/${p.session_id}`}
            className="flex items-center gap-3 rounded-2xl border border-brand/60 bg-surface px-4 py-3 active:scale-[.98] transition-transform"
          >
            <span className="w-10 h-10 rounded-xl bg-brand/15 text-brand flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink line-clamp-2">
                Como foi o {p.title} {whenLabel(p.date)}?
              </span>
              <span className="block text-xs text-ink-muted">Leva 20 segundos · vale {POINTS.review} pontos</span>
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
