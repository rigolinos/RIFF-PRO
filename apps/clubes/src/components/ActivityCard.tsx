import { Link } from 'react-router-dom';
import { Clock, MapPin, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CoverImage, SpotsMeter, StatusPill } from '@riff/core/domain';
import { KINDS, type ActivityKind } from '@riff/core/lib/copy';
import { useProfile } from '@riff/core/hooks/useProfile';
import type { Activity } from '@/hooks/useActivities';

/** Cartão de atividade: toque abre o detalhe (onde ficam inscrição, dependentes e presença). */
export function ActivityCard({ activity, showCommunity = true }: { activity: Activity; showCommunity?: boolean }) {
  const { profile } = useProfile();
  const kind = KINDS[activity.kind as ActivityKind];
  const max = activity.max_participants ?? 0;
  const current = activity.current_participants ?? 0;
  const full = current >= max || activity.status === 'full';
  const organizing = activity.professional_id === profile?.id;
  const dependentsIn = Object.keys(activity.dependentBookings).length;

  return (
    <Link
      to={`/atividade/${activity.id}`}
      className="block overflow-hidden rounded-[20px] bg-surface border border-line active:scale-[.98] transition-transform"
    >
      <CoverImage
        src={activity.cover_image_url}
        categorySlug={activity.category?.slug ?? undefined}
        kind={activity.kind as ActivityKind}
        className="aspect-[21/9]"
      >
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2.5 h-7 rounded-full bg-surface/90 backdrop-blur-sm text-xs font-bold text-ink flex items-center first-letter:uppercase">
            {format(parseISO(activity.date), "EEE, d 'de' MMM", { locale: ptBR })}
          </span>
          <span className="px-2.5 h-7 rounded-full bg-surface/90 backdrop-blur-sm text-xs font-bold text-ink flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-brand" /> {activity.start_time.substring(0, 5)}
          </span>
        </div>
      </CoverImage>

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="type-subtitle text-ink leading-tight">
            {activity.category?.emoji} {activity.title}
          </h3>
          {organizing ? (
            <StatusPill text="Você organiza" variant="info" className="shrink-0" />
          ) : activity.myBookingId ? (
            <StatusPill text="Inscrito" variant="success" className="shrink-0" />
          ) : full ? (
            <StatusPill text="Lotada" variant="danger" className="shrink-0" />
          ) : null}
        </div>
        <p className="text-sm text-ink-muted truncate">
          {kind?.chip ?? 'Atividade'}
          {activity.professional?.full_name ? ` · com ${activity.professional.full_name.split(' ')[0]}` : ''}
          {showCommunity && activity.organization?.name ? ` · ${activity.organization.name}` : ''}
        </p>
        <p className="flex items-center gap-1 text-sm text-ink-muted">
          <MapPin className="w-4 h-4 shrink-0" /> <span className="truncate">{activity.location_name || 'Local a confirmar'}</span>
        </p>
        {(activity.minors_allowed || dependentsIn > 0) && (
          <p className="flex items-center gap-1 text-xs text-accent">
            <Users className="w-3.5 h-3.5 shrink-0" />
            {activity.minors_allowed ? `Aceita menores${activity.min_age ? ` a partir de ${activity.min_age} anos` : ''}` : ''}
            {dependentsIn > 0 ? `${activity.minors_allowed ? ' · ' : ''}${dependentsIn} dependente${dependentsIn > 1 ? 's' : ''} inscrito${dependentsIn > 1 ? 's' : ''}` : ''}
          </p>
        )}
        <SpotsMeter current={current} max={max || 1} className="pt-1" />
      </div>
    </Link>
  );
}
