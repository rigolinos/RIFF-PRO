import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Share2, MapPin, Clock, Users, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { SessionCardSkeleton } from '@/components/skeletons/SessionCardSkeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const SessionDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const { data: session, isLoading, error } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          category:categories(name, emoji),
          professional:profiles!sessions_professional_id_fkey(
            id, full_name, avatar_url, role
          ),
          bookings(id, status)
        `)
        .eq('id', id || '')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleBookClick = () => {
    if (!user) {
      toast.error('Você precisa fazer login para reservar.');
      navigate(`/login?redirect=/session/${id}`);
      return;
    }
    setIsCheckoutOpen(true);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Aula de ${session?.category?.name} com ${session?.professional?.full_name}`,
          text: session?.title,
          url: url,
        });
      } catch (err) {
        console.error('Error sharing', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col px-6 py-8">
        <div className="mb-8">
          <button onClick={() => navigate(-1)} className="text-ink-muted">
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>
        <SessionCardSkeleton />
      </div>
    );
  }

  if (error || !session || session.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-bg flex flex-col px-6 py-8 items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl mb-4">🕵️‍♂️</div>
        <h2 className="text-xl font-bold text-ink mb-2">Aula não encontrada</h2>
        <p className="text-ink-muted text-sm mb-6">Esta aula pode ter sido cancelada ou o link é inválido.</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-brand text-brand-ink font-semibold rounded-xl">
          Voltar ao Início
        </button>
      </div>
    );
  }

  const dateStr = format(parseISO(session.date), "EEEE, d 'de' MMMM", { locale: ptBR });
  const timeStr = session.start_time.substring(0, 5);
  const isFull = (session.current_participants ?? 0) >= (session.max_participants ?? 0);
  const isFree = session.price_per_slot === 0;
  const isPast = parseISO(`${session.date}T${session.start_time}`) < new Date();

  return (
    <div className="min-h-[100dvh] bg-bg flex flex-col pb-safe">
      {/* Header Image / Pattern */}
      <div className="h-56 bg-surface relative flex items-start justify-between p-4 border-b border-line">
        {session.cover_image_url ? (
          <img src={session.cover_image_url} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-accent/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-black/20" />
        
        <Button onClick={() => navigate(-1)} variant="ghost" size="icon" className="relative z-10 rounded-full bg-surface/50 backdrop-blur-md shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Button onClick={handleShare} variant="ghost" size="icon" className="relative z-10 rounded-full bg-surface/50 backdrop-blur-md shadow-sm">
          <Share2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 -mt-8 relative z-10">
        <div className="glass-card p-6 mb-6">
          <div className="flex gap-4 items-center border-b border-line pb-4 mb-4">
            <img 
              src={session.professional?.avatar_url || `https://ui-avatars.com/api/?name=${session.professional?.full_name}&background=10b981&color=000`} 
              alt="Prof" 
              className="w-16 h-16 rounded-full border-2 border-brand/20"
            />
            <div>
              <p className="text-sm text-brand font-semibold uppercase tracking-wider">{session.category?.name}</p>
              <h1 className="text-xl font-bold text-ink leading-tight mt-1">{session.title}</h1>
              <p className="text-sm text-ink-muted mt-1">por {session.professional?.full_name}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-ink">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-brand shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="capitalize">
                <p className="font-semibold">{dateStr}</p>
                <p className="text-ink-muted">{timeStr} • {session.duration_minutes} min</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-ink">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-brand shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">{session.location_name}</p>
                {session.location_address && <p className="text-ink-muted text-xs">{session.location_address}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-ink">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-brand shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">{(session.current_participants ?? 0)} / {(session.max_participants ?? 0)} confirmados</p>
                <p className="text-ink-muted text-xs">{(session.max_participants ?? 0) - (session.current_participants ?? 0)} vagas restantes</p>
              </div>
            </div>
          </div>
          
          {session.what_to_bring && (
            <div className="mt-4 pt-4 border-t border-line">
              <h3 className="font-semibold text-sm mb-2">O que levar</h3>
              <p className="text-sm text-ink-muted whitespace-pre-wrap">{session.what_to_bring}</p>
            </div>
          )}
          
          {session.description && (
            <div className="mt-4 pt-4 border-t border-line">
              <h3 className="font-semibold text-sm mb-2">Sobre a Aula</h3>
              <p className="text-sm text-ink-muted whitespace-pre-wrap">{session.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Checkout */}
      <div className="sticky bottom-0 bg-bg/80 backdrop-blur-xl border-t border-line p-4 pb-safe flex items-center gap-4 z-50">
        <div className="flex-1">
          <p className="text-xs text-ink-muted">Preço por vaga</p>
          <p className="text-xl font-bold text-brand">
            {isFree ? 'Gratuito' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(session.price_per_slot)}
          </p>
        </div>
        
        <Button
          variant={isPast || isFull ? 'secondary' : 'default'}
          size="lg"
          onClick={handleBookClick}
          disabled={isPast || isFull}
          className="flex-none px-8 h-12"
        >
          {isPast ? 'Finalizada' : isFull ? 'Lotada' : 'Garantir Vaga'}
        </Button>
      </div>

      <CheckoutModal 
        session={session}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
};

export default SessionDetails;
