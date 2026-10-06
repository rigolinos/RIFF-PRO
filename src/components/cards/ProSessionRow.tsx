import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight } from 'lucide-react';
import { SportIcon, StatusPill } from '@riff/core/domain';
import { cn } from '@riff/core/lib/utils';
import { formatBRL } from '@riff/core/lib/money';

export interface ProSessionLike {
  id: string;
  title: string;
  date: string;
  start_time: string;
  duration_minutes?: number | null;
  location_name?: string | null;
  current_participants?: number | null;
  max_participants?: number | null;
  status?: string | null;
  price_per_slot?: number | null;
  category?: { slug?: string | null } | null;
}

const STATUS: Record<string, { text: string; variant: 'success' | 'danger' | 'neutral' | 'info' }> = {
  full: { text: 'Lotada', variant: 'danger' },
  completed: { text: 'Encerrada', variant: 'neutral' },
  cancelled: { text: 'Cancelada', variant: 'danger' },
};

/** Atividade do organizador: horário, esporte, local, ocupação e situação; ação opcional embaixo. */
export function ProSessionRow({
  session,
  showDay = false,
  highlight = false,
  action,
}: {
  session: ProSessionLike;
  showDay?: boolean;
  highlight?: boolean;
  action?: React.ReactNode;
}) {
  const max = session.max_participants ?? 0;
  const current = session.current_participants ?? 0;
  const pct = max ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const st = session.status ? STATUS[session.status] : undefined;
  const price = Number(session.price_per_slot ?? 0);

  return (
    <div className={cn(highlight && 'bg-surface border border-brand/50 rounded-2xl overflow-hidden')}>
      <Link to={`/session/${session.id}`} className="flex gap-3 px-4 py-3 active:bg-elevated">
        <div className="w-14 shrink-0 text-center border-r border-line pr-3 flex flex-col justify-center">
          {showDay && (
            <span className="text-xs text-ink-muted whitespace-nowrap">{format(parseISO(session.date), 'EEEEEE d', { locale: ptBR })}</span>
          )}
          <span className="type-subtitle text-ink leading-tight">{session.start_time.substring(0, 5)}</span>
          {session.duration_minutes ? <span className="text-xs text-ink-muted">{session.duration_minutes} min</span> : null}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink min-w-0">
              <SportIcon slug={session.category?.slug} className="w-4 h-4 text-brand shrink-0" />
              <span className="truncate">{session.title}</span>
            </p>
            {st && <StatusPill text={st.text} variant={st.variant} className="shrink-0" />}
          </div>
          <p className="text-xs text-ink-muted truncate">
            {session.location_name || 'Local a confirmar'}
            {session.price_per_slot != null ? ` · ${price > 0 ? formatBRL(price) : 'Grátis'}` : ''}
          </p>
          <div className="flex items-center gap-2 pt-0.5">
            <div className="flex-1 h-1 rounded-full bg-elevated overflow-hidden" aria-hidden="true">
              <div className={cn('h-1 rounded-full', current >= max && max > 0 ? 'bg-danger' : 'bg-brand')} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-ink-muted shrink-0">
              {current} de {max} inscritos
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-ink-muted self-center shrink-0" aria-hidden="true" />
      </Link>
      {action && <div className="px-4 pb-3">{action}</div>}
    </div>
  );
}
