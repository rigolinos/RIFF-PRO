import type { LucideIcon } from 'lucide-react';
import { cn } from '@riff/core/lib/utils';

export interface TicketItem {
  label?: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: LucideIcon;
}

/**
 * Cartão "ingresso": colunas com divisórias, sobreposto ao HeroHeader
 * (overlap). Datas, horário e local de uma atividade, ou os números de um perfil.
 */
export function TicketGrid({
  items,
  footer,
  header,
  overlap = true,
  className,
}: {
  items: TicketItem[];
  footer?: React.ReactNode;
  header?: React.ReactNode;
  overlap?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative z-10 mx-4 bg-elevated border border-line rounded-2xl shadow-[var(--shadow-2)] overflow-hidden',
        overlap && '-mt-10',
        className,
      )}
    >
      {header && <div className="px-4 pt-3 pb-2">{header}</div>}
      <div
        className={cn('grid divide-x divide-line', header && 'border-t border-dashed border-line')}
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((it, i) => (
          <div key={i} className="p-3 text-center flex flex-col items-center min-w-0">
            {it.label && <p className="type-label">{it.label}</p>}
            {it.icon && <it.icon className="w-4 h-4 text-brand my-0.5" />}
            <div className="type-title leading-tight max-w-full truncate">{it.value}</div>
            {it.sub && <div className="text-xs text-ink-muted line-clamp-2">{it.sub}</div>}
          </div>
        ))}
      </div>
      {footer && <div className="border-t border-dashed border-line px-4 py-2 text-xs text-center">{footer}</div>}
    </div>
  );
}
