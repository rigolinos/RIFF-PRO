import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight, Star } from 'lucide-react';
import { SportIcon, StatusPill } from '@riff/core/domain';
import { KINDS, type ActivityKind } from '@riff/core/lib/copy';
import { cn } from '@riff/core/lib/utils';
import { formatBRL } from '@riff/core/lib/money';
import type { SessionWithJoins } from '@/types/session';

interface SessionRowProps {
  session: SessionWithJoins;
  /** Mostra o dia acima do horário (listas que misturam dias) */
  showDay?: boolean;
  /** Destaque dourado (atividades de hoje) */
  highlight?: boolean;
  /** Cidade ao lado do local (seção "outras cidades") */
  showCity?: boolean;
}

/** Atividade em linha compacta: horário, esporte, título, organizador, local, vagas e preço. */
export function SessionRow({ session, showDay = false, highlight = false, showCity = false }: SessionRowProps) {
  const kind = KINDS[session.kind as ActivityKind];
  const max = session.max_participants ?? 0;
  const current = session.current_participants ?? 0;
  const left = Math.max(0, max - current);
  const full = left <= 0 || session.status === 'full';
  const pct = max ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const pro = session.professional;
  const price = Number(session.price_per_slot ?? 0);

  return (
    <Link
      to={`/session/${session.id}`}
      className={cn('flex gap-3 px-4 py-3 transition-colors active:bg-elevated', highlight && 'bg-surface border border-brand/50 rounded-2xl')}
    >
      <div className="w-14 shrink-0 text-center border-r border-line pr-3 flex flex-col justify-center">
        {showDay && (
          <span className="text-xs text-ink-muted whitespace-nowrap">{format(parseISO(session.date), 'EEEEEE d', { locale: ptBR })}</span>
        )}
        <span className="type-subtitle text-ink leading-tight">{session.start_time.substring(0, 5)}</span>
        {session.duration_minutes ? <span className="text-xs text-ink-muted">{session.duration_minutes} min</span> : null}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink min-w-0">
          <SportIcon slug={session.category?.slug} className="w-4 h-4 text-brand shrink-0" />
          <span className="truncate">{session.title}</span>
        </p>
        <p className="text-xs text-ink-muted truncate">
          {kind?.chip ?? 'Atividade'}
          {pro?.full_name ? ` · ${pro.full_name.split(' ')[0]}` : ''}
          {pro?.total_reviews ? (
            <>
              {' · '}
              <Star className="inline w-3 h-3 -mt-0.5 text-accent" /> {Number(pro.rating_avg ?? 0).toFixed(1)}
            </>
          ) : null}
        </p>
        <p className="text-xs text-ink-muted truncate">
          {session.location_name || 'Local a confirmar'}
          {showCity && session.city ? ` · ${session.city}` : ''}
        </p>
        <div className="flex items-center gap-2 pt-0.5">
          <div className="flex-1 h-1 rounded-full bg-elevated overflow-hidden" aria-hidden="true">
            <div className={cn('h-1 rounded-full', full ? 'bg-danger' : 'bg-brand')} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-ink-muted shrink-0">{full ? 'Lotada' : `${left} vaga${left === 1 ? '' : 's'}`}</span>
          <span className={cn('text-sm font-bold shrink-0 font-display', price > 0 ? 'text-accent' : 'text-success')}>
            {price > 0 ? formatBRL(price) : 'Grátis'}
          </span>
        </div>
        {!full && left <= 2 && (
          <div className="pt-1">
            <StatusPill text={left === 1 ? 'Última vaga' : 'Últimas vagas'} variant="alert" />
          </div>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-ink-muted self-center shrink-0" aria-hidden="true" />
    </Link>
  );
}
