import { addDays, format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@riff/core/lib/utils';

/**
 * Faixa dos próximos 7 dias: ponto dourado nos dias com evento, hoje com borda,
 * tocar seleciona (tocar de novo limpa). `selected`/`onSelect` em AAAA-MM-DD.
 */
export function WeekStrip({
  start,
  hasEvents,
  selected,
  onSelect,
  overlap = false,
  className,
}: {
  start: Date;
  hasEvents: (day: Date) => boolean;
  selected: string | null;
  onSelect: (day: string | null) => void;
  overlap?: boolean;
  className?: string;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div
      className={cn(
        'grid grid-cols-7 gap-1',
        overlap && 'relative z-10 -mt-8 mx-4 p-2 bg-elevated border border-line rounded-2xl shadow-[var(--shadow-2)]',
        className,
      )}
      role="group"
      aria-label="Dias da semana"
    >
      {days.map((d) => {
        const key = format(d, 'yyyy-MM-dd');
        const active = selected === key;
        const has = hasEvents(d);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(active ? null : key)}
            aria-pressed={active}
            aria-label={format(d, "EEEE, d 'de' MMMM", { locale: ptBR })}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 rounded-xl border transition-colors',
              active ? 'bg-brand border-brand' : isSameDay(d, start) ? 'border-brand/50' : 'border-transparent',
            )}
          >
            <span className={cn('text-xs', active ? 'text-brand-ink' : 'text-ink-muted')}>{format(d, 'EEEEEE', { locale: ptBR })}</span>
            <span className={cn('text-sm font-semibold', active ? 'text-brand-ink' : 'text-ink')}>{format(d, 'd')}</span>
            <span className={cn('w-1 h-1 rounded-full', has ? (active ? 'bg-brand-ink' : 'bg-brand') : 'bg-transparent')} />
          </button>
        );
      })}
    </div>
  );
}
