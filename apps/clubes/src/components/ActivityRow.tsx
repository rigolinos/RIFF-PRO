import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight } from 'lucide-react';
import { StatusPill } from '@riff/core/domain';
import { KINDS, type ActivityKind } from '@riff/core/lib/copy';
import { useProfile } from '@riff/core/hooks/useProfile';
import { cn } from '@riff/core/lib/utils';
import type { Activity } from '@/hooks/useActivities';
import { SportIcon } from '@/components/SportIcon';
import { WhoIsGoing } from '@/components/WhoIsGoing';

interface ActivityRowProps {
  activity: Activity;
  /** Mostra o dia acima do horário (listas que misturam dias) */
  showDay?: boolean;
  showCommunity?: boolean;
  /** Destaque dourado (eventos de hoje) */
  highlight?: boolean;
}

/** Evento em linha compacta: horário à esquerda, título, tipo e local, vagas e situação. */
export function ActivityRow({ activity, showDay = false, showCommunity = false, highlight = false }: ActivityRowProps) {
  const { profile } = useProfile();
  const kind = KINDS[activity.kind as ActivityKind];
  const max = activity.max_participants ?? 0;
  const current = activity.current_participants ?? 0;
  const full = current >= max || activity.status === 'full';
  const organizing = activity.professional_id === profile?.id;
  const dependentsIn = Object.keys(activity.dependentBookings).length;
  const pct = max ? Math.min(100, Math.round((current / max) * 100)) : 0;

  return (
    <Link
      to={`/atividade/${activity.id}`}
      className={cn(
        'flex gap-3 px-4 py-3 transition-colors active:bg-elevated',
        highlight && 'bg-surface border border-brand/50 rounded-2xl',
      )}
    >
      <div className="w-14 shrink-0 text-center border-r border-line pr-3 flex flex-col justify-center">
        {showDay && (
          <span className="text-xs text-ink-muted whitespace-nowrap">
            {format(parseISO(activity.date), 'EEEEEE d', { locale: ptBR })}
          </span>
        )}
        <span className="type-subtitle text-ink leading-tight">{activity.start_time.substring(0, 5)}</span>
        {activity.duration_minutes ? <span className="text-xs text-ink-muted">{activity.duration_minutes} min</span> : null}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <SportIcon slug={activity.category?.slug} className="w-4 h-4 text-brand shrink-0" />
          <span className="truncate">{activity.title}</span>
        </p>
        <p className="text-xs text-ink-muted truncate">
          {kind?.chip ?? 'Atividade'} · {activity.location_name || 'Local a confirmar'}
          {showCommunity && activity.organization?.name ? ` · ${activity.organization.name}` : ''}
        </p>
        <div className="flex items-center gap-2 pt-0.5">
          <div className="flex-1 h-1 rounded-full bg-elevated overflow-hidden" aria-hidden="true">
            <div className={cn('h-1 rounded-full', full ? 'bg-danger' : 'bg-brand')} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-ink-muted shrink-0">
            {full ? 'Lotado' : `${current} de ${max} vagas`}
          </span>
        </div>
        <div className="pt-1 empty:hidden">
          <WhoIsGoing participants={activity.participants} />
        </div>
        {(organizing || activity.myBookingId || dependentsIn > 0 || activity.minors_allowed) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {organizing && <StatusPill text="Você organiza" variant="info" />}
            {activity.myBookingId && <StatusPill text="Inscrito" variant="success" />}
            {dependentsIn > 0 && (
              <StatusPill text={`${dependentsIn} dependente${dependentsIn > 1 ? 's' : ''}`} variant="success" />
            )}
            {activity.minors_allowed && !dependentsIn && (
              <StatusPill text={`Menores${activity.min_age ? ` ${activity.min_age}+` : ''}`} variant="alert" />
            )}
          </div>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-ink-muted self-center shrink-0" aria-hidden="true" />
    </Link>
  );
}
