import { MapPin, CalendarDays, Clock, Users, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    <div className="glass-card overflow-hidden flex flex-col transition-all active:scale-[0.98]">
      <div className="p-4 flex gap-4">
        {/* Avatar Pro */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-white/10 overflow-hidden border-2 border-emerald-500/30 flex items-center justify-center text-xl">
            {pro?.avatar_url ? (
              <img src={pro.avatar_url} alt={pro.full_name} className="w-full h-full object-cover" />
            ) : (
              <span>{pro?.full_name?.charAt(0)}</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1.5 bg-black/50 px-2 py-0.5 rounded-full border border-white/5">
            <Star className="w-3 h-3 text-emerald-400 fill-emerald-400" />
            <span className="text-[10px] font-medium tabular-nums">{pro?.rating_avg > 0 ? pro.rating_avg.toFixed(1) : 'Novo'}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1 gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md w-fit shrink-0">
              <span>{category?.emoji}</span>
              <span>{category?.name}</span>
            </div>
            
            {/* Scarcity Badge Top Right */}
            {isFull ? (
              <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-full uppercase tracking-wider border border-red-400/20 shrink-0">
                Lotada
              </span>
            ) : spotsLeft <= 2 ? (
              <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wider shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="tabular-nums tracking-tight font-extrabold">{spotsLeft} VAGAS</span>
              </span>
            ) : null}
          </div>

          <h3 className="font-semibold text-base text-foreground leading-tight truncate mb-1">
            {session.title}
          </h3>
          <p className="text-sm text-muted-foreground truncate mb-3">
            com {pro?.full_name}
          </p>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="capitalize">{dateStr}</span>
              <span className="mx-0.5">•</span>
              <Clock className="w-3.5 h-3.5" />
              <span className="tabular-nums">{timeStr}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{session.location_name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Booking Bar */}
      <div className="border-t border-white/5 bg-white/[0.02] p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Por vaga</p>
          <p className="text-lg text-foreground tabular-nums tracking-tight font-extrabold">
            {isFree ? (
              <span className="text-emerald-400 font-bold">Gratuito</span>
            ) : (
              <>
                <span className="text-xs font-semibold mr-0.5 text-muted-foreground">R$</span>
                {session.price_per_slot.toFixed(2).replace('.', ',')}
              </>
            )}
          </p>
        </div>

        <button
          onClick={() => onBookClick(session)}
          disabled={isFull}
          className={`h-11 px-6 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
            isFull 
              ? 'bg-white/5 text-muted-foreground cursor-not-allowed' 
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_8px_24px_rgba(16,185,129,0.25)] active:scale-95'
          }`}
        >
          {isFull ? (
            'Esgotado'
          ) : (
            'Garantir Vaga'
          )}
        </button>
      </div>
      
      {/* Visual Progress Bar for Scarcity */}
      {!isFull && (
        <div className="h-1 w-full bg-white/5">
          <div 
            className={`h-full transition-all duration-1000 ${spotsLeft <= 2 ? 'bg-amber-400' : 'bg-emerald-500/50'}`}
            style={{ width: `${(session.current_participants / session.max_participants) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
};
