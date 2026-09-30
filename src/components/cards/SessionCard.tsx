import { MapPin, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CoverImage, PriceTag, RatingBadge, SpotsMeter, StatusPill } from '../domain';

interface SessionCardProps {
  session: any;
  onBookClick: (session: any) => void;
}

export const SessionCard = ({ session, onBookClick }: SessionCardProps) => {
  const pro = session.professional;
  const category = session.category;
  
  const spotsLeft = session.max_participants - session.current_participants;
  const isFull = spotsLeft <= 0 || session.status === 'full';
  
  const dateStr = format(parseISO(session.date), "EEE, d 'de' MMM", { locale: ptBR });
  const timeStr = session.start_time.substring(0, 5);

  const handleBook = (e: React.MouseEvent) => {
    e.preventDefault();
    onBookClick(session);
  };

  return (
    <Link to={`/session/${session.id}`} className="block overflow-hidden rounded-[20px] bg-surface border border-line active:scale-[.98] transition-transform">
      <CoverImage 
        src={session.cover_image_url} 
        categorySlug={category?.slug} 
        className="aspect-[16/9]"
      >
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge variant="secondary" className="shadow-sm bg-surface/90 text-ink backdrop-blur-sm border-0 font-bold capitalize">
            {dateStr}
          </Badge>
          <Badge variant="secondary" className="shadow-sm bg-surface/90 text-ink backdrop-blur-sm border-0 font-bold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-brand" />
            {timeStr}
          </Badge>
        </div>

        <div className="absolute top-3 right-3">
          {isFull ? (
            <StatusPill text="Lotada" variant="danger" />
          ) : spotsLeft <= 2 ? (
            <StatusPill text={`${spotsLeft} vaga${spotsLeft > 1 ? 's' : ''}`} variant="alert" className="font-bold animate-pulse" />
          ) : null}
        </div>
      </CoverImage>

      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <div>
            <h3 className="font-display font-bold text-lg text-ink leading-tight mb-1">
              {session.title}
            </h3>
            <div className="flex items-center gap-1 text-sm text-ink-muted">
              <span className="font-medium text-ink">{pro?.full_name || 'Organizador'}</span>
              <span>·</span>
              <RatingBadge rating={pro?.rating_avg} count={pro?.rating_count} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-sm text-ink-muted">
          <MapPin className="w-4 h-4 shrink-0 text-slate" />
          <span className="truncate">{session.location_name || 'Local a confirmar'}</span>
        </div>

        <SpotsMeter current={session.current_participants} max={session.max_participants} className="my-3" />

        <div className="flex items-center justify-between pt-1">
          <PriceTag amount={session.price_per_slot} />
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleBook}
            disabled={isFull}
          >
            {isFull ? 'Lotada' : 'Reservar'}
          </Button>
        </div>
      </div>
    </Link>
  );
};
