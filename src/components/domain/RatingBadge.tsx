import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface RatingBadgeProps {
  rating?: number | null;
  count?: number | null;
  className?: string;
  showCount?: boolean;
}

export function RatingBadge({ rating, count, className, showCount = true }: RatingBadgeProps) {
  const isNew = !rating || rating === 0 || !count || count === 0;

  if (isNew) {
    return (
      <Badge variant="pill" className={cn("flex items-center gap-1 bg-surface border-line text-ink-muted", className)}>
        <Star className="w-3 h-3 fill-slate text-slate" />
        <span className="font-semibold">Novo</span>
      </Badge>
    );
  }

  const formattedRating = Number(rating).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <Badge variant="pill" className={cn("flex items-center gap-1", className)}>
      <Star className="w-3 h-3 fill-brand text-brand" />
      <span className="font-semibold tabular-nums text-ink">{formattedRating}</span>
      {showCount && <span className="text-ink-muted ml-0.5">({count})</span>}
    </Badge>
  );
}
