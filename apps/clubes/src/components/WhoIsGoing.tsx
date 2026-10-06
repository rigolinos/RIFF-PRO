import { Avatar } from '@riff/core/domain';
import { cn } from '@riff/core/lib/utils';
import type { Participants } from '@/hooks/useActivities';
import { kidsLabel } from '@/lib/people';

/** Fotos sobrepostas de quem confirmou presença, com a contagem ao lado. */
export function WhoIsGoing({ participants, max = 3, size = 'sm' }: { participants: Participants; max?: number; size?: 'sm' | 'md' }) {
  const { people, count, dependents } = participants;
  if (!count && !dependents) return null;
  const shown = people.slice(0, max);
  const extra = count - shown.length;
  const box = size === 'md' ? 'w-9 h-9' : 'w-6 h-6';

  return (
    <div className="flex items-center gap-2 min-w-0">
      {shown.length > 0 && (
        <div className="flex -space-x-2 shrink-0">
          {shown.map((p, i) => (
            <Avatar
              key={p.id ?? `reservado-${i}`}
              src={p.avatar_url}
              name={p.name}
              className={cn(box, 'ring-2 ring-surface')}
              fallbackClassName="text-xs"
            />
          ))}
          {extra > 0 && (
            <span
              className={cn(box, 'rounded-full ring-2 ring-surface bg-elevated text-ink text-xs font-semibold flex items-center justify-center')}
            >
              +{extra}
            </span>
          )}
        </div>
      )}
      <span className="text-xs text-ink-muted truncate">
        {count > 0 ? `${count} confirmado${count > 1 ? 's' : ''}` : ''}
        {count > 0 && dependents > 0 ? ' · ' : ''}
        {kidsLabel(dependents)}
      </span>
    </div>
  );
}
