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
    <Link to={`/session/${session.id}`} className="glass-card overflow-hidden flex flex-col transition-all active:scale-[0.98] block">
      <div className="p-4 flex gap-4">
        {/* Avatar Pro */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-line overflow-hidden border-2 border-brand/30 flex items-center justify-center text-xl text-ink font-display">
            {pro?.avatar_url ? (
              <img src={pro.avatar_url} alt={pro.full_name} className="w-full h-full object-cover" />
            ) : (
              <span>{pro?.full_name?.charAt(0)}</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1.5 bg-surface shadow-sm px-2 py-0.5 rounded-full border border-line">
            <Star className="w-3 h-3 text-accent fill-accent" />
            <span className="text-[10px] font-bold tabular-nums text-ink">{pro?.rating_avg > 0 ? pro.rating_avg.toFixed(1) : 'Novo'}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1 gap-2">
            <Badge variant="pill" className="w-fit shrink-0 lowercase">
              <span className="mr-1">{category?.emoji}</span>
              {category?.name}
            </Badge>
            
            {/* Scarcity Badge Top Right */}
            {isFull ? (
              <Badge variant="destructive" className="shrink-0">
                Lotada
              </Badge>
            ) : spotsLeft <= 2 ? (
              <Badge variant="warning" className="shrink-0 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                <span className="tabular-nums tracking-tight font-extrabold">{spotsLeft} VAGAS</span>
              </Badge>
            ) : null}
          </div>

          <h3 className="font-display font-semibold text-base text-ink leading-tight truncate mb-1">
            {session.title}
          </h3>
          <p className="text-sm text-ink-muted truncate mb-3">
            com {pro?.full_name}
          </p>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="capitalize">{dateStr}</span>
              <span className="mx-0.5">•</span>
              <Clock className="w-3.5 h-3.5" />
              <span className="tabular-nums">{timeStr}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-muted truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{session.location_name}</span>
            </div>
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
