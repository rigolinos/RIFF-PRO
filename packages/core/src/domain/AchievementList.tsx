import { Check } from 'lucide-react';
import { cn } from '@riff/core/lib/utils';
import { ACHIEVEMENTS, type Achievement } from '@riff/core/lib/achievements';

/** Conquistas com barra de progresso; as já conquistadas aparecem primeiro, em dourado. */
export function AchievementList({ items }: { items: Achievement[] }) {
  const sorted = [...items].sort((a, b) => Number(b.current >= b.target) - Number(a.current >= a.target));
  return (
    <ul className="grid grid-cols-1 gap-2">
      {sorted.map((a) => {
        const meta = ACHIEVEMENTS[a.key];
        if (!meta) return null;
        const done = a.current >= a.target;
        const pct = Math.round((a.current / a.target) * 100);
        return (
          <li key={a.key} className={cn('flex items-center gap-3 rounded-2xl border px-4 py-3', done ? 'bg-brand/10 border-brand/50' : 'bg-surface border-line')}>
            <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', done ? 'bg-brand text-brand-ink' : 'bg-elevated text-ink-muted')}>
              {done ? <Check className="w-5 h-5" /> : <meta.icon className="w-5 h-5" strokeWidth={1.75} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink truncate">{meta.title}</p>
                <span className="text-xs text-ink-muted shrink-0">
                  {a.current} de {a.target}
                </span>
              </div>
              <p className="text-xs text-ink-muted truncate">{done ? 'Conquistado' : `${a.target} ${meta.hint(a.detail)}`}</p>
              {!done && (
                <div className="mt-1.5 h-1 rounded-full bg-elevated overflow-hidden" aria-hidden="true">
                  <div className="h-1 rounded-full bg-brand" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
