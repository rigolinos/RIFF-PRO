import { MapPin, CalendarDays, Clock, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface SessionCardProps {
  session: any;
  onBookClick: (session: any) => void;
}

export const SessionCard = ({ session, onBookClick }: SessionCardProps) => {
  const pro = session.professional;
  const category = session.category;
  
  const spotsLeft = session.max_participants - session.current_participants;
  const isFull = spotsLeft <= 0 || session.status === 'full';
  
  // Formatters
  const dateStr = format(parseISO(session.date), "EEE, d 'de' MMM", { locale: ptBR });
  const timeStr = session.start_time.substring(0, 5);
  const isFree = session.price_per_slot === 0;

  return (
    <Link to={`/session/${session.id}`} className="block overflow-hidden rounded-card bg-surface shadow-1 active:scale-[.99] transition-transform">
      <div className="relative aspect-[16/9] bg-line w-full overflow-hidden border-b border-line">
        {session.cover_image_url ? (
          <img src={session.cover_image_url} alt={session.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-accent/20" />
        )}
        
        {/* Scarcity Badge / Top Right */}
        <div className="absolute top-3 right-3">
          {isFull ? (
            <Badge variant="destructive" className="shadow-sm font-bold">Lotada</Badge>
          ) : spotsLeft <= 2 ? (
            <Badge variant="warning" className="shadow-sm font-bold animate-pulse">{spotsLeft} VAGAS</Badge>
          ) : null}
        </div>

        {/* Date / Top Left */}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="shadow-sm bg-surface/90 text-ink backdrop-blur-sm border-0 font-bold capitalize">
            {dateStr}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-display font-bold text-lg text-ink leading-tight">
            {session.title}
          </h3>
          <Badge variant="pill" className="w-fit shrink-0 lowercase shadow-none border-line">
            {category?.emoji}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-line overflow-hidden border border-brand/20 flex items-center justify-center text-[10px] text-ink font-bold">
            {pro?.avatar_url ? (
              <img src={pro.avatar_url} alt={pro.full_name} className="w-full h-full object-cover" />
            ) : (
              <span>{pro?.full_name?.charAt(0)}</span>
            )}
          </div>
          <span className="text-sm font-medium text-ink-muted truncate">{pro?.full_name}</span>
          <span className="mx-1 text-line">•</span>
          <div className="flex items-center gap-1 text-accent">
            <Star className="w-3 h-3 fill-accent" />
            <span className="text-xs font-bold text-ink">{pro?.rating_avg > 0 ? pro.rating_avg.toFixed(1) : 'Novo'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-ink-muted">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="tabular-nums">{timeStr}</span>
            <span className="ml-1 opacity-60">({session.duration_minutes} min)</span>
          </div>
          <div className="flex items-center gap-1 truncate">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{session.location_name}</span>
          </div>
        </div>
      </div>

      {/* Footer / Booking Bar */}
      <div className="border-t border-line bg-surface/50 p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-muted mb-0.5">Por vaga</p>
          <p className="text-lg text-ink tabular-nums tracking-tight font-extrabold font-display">
            {isFree ? (
              <span className="text-brand font-bold">Gratuito</span>
            ) : (
              <>
                <span className="text-xs font-semibold mr-0.5 text-ink-muted">R$</span>
                {session.price_per_slot.toFixed(2).replace('.', ',')}
              </>
            )}
          </p>
        </div>

        <Button
          variant={isFull ? "secondary" : "primary"}
          disabled={isFull}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBookClick(session);
          }}
        >
          {isFull ? 'Esgotado' : 'Garantir Vaga'}
        </Button>
      </div>
      
      {/* Visual Progress Bar for Scarcity */}
      {!isFull && (
        <div className="h-1 w-full bg-line">
          <div 
            className={`h-full transition-all duration-1000 ${spotsLeft <= 2 ? 'bg-warning' : 'bg-brand'}`}
            style={{ width: `${(session.current_participants / session.max_participants) * 100}%` }}
          />
        </div>
      )}
    </Link>
  );
};
