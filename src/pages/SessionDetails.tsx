import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Share2, MapPin, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { Button } from '@/components/ui/button';
import { ActivityKind } from '@/lib/copy';
import { CoverImage, Avatar, SpotsMeter, PriceTag, StatusPill, RatingBadge } from '@/components/domain';

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
          category:categories(name, emoji, slug),
          professional:profiles!sessions_professional_id_fkey(
            id, full_name, avatar_url, public_slug, credential_verified, rating_avg, total_reviews
          )
        `)
        .eq('id', id!)
        .single();
        
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center">Carregando...</div>;
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
        <h2 className="type-title mb-2">Atividade não encontrada</h2>
        <p className="text-ink-muted mb-6">Esta atividade pode ter sido cancelada ou removida.</p>
        <Button onClick={() => navigate(-1)} variant="secondary">Voltar</Button>
      </div>
    );
  }

  const pro = session.professional;
  const category = session.category;
  
  const spotsLeft = (session.max_participants || 0) - (session.current_participants || 0);
  const isFull = spotsLeft <= 0 || session.status === 'full';
  
  const dateStr = format(parseISO(session.date), "EEEE, d 'de' MMMM", { locale: ptBR });
  const timeStr = session.start_time.substring(0, 5);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: session.title,
        text: `Participe da atividade de ${session.title} com ${pro.full_name}!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado para a área de transferência');
    }
  };

  const handleBook = () => {
    if (!user) {
      navigate(`/login?redirect=/session/${session.id}`);
      return;
    }
    setIsCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen bg-bg pb-28">
      {/* Header with Cover */}
      <div className="relative h-64 md:h-80">
        <CoverImage 
          src={session.cover_image_url} 
          categorySlug={category?.slug}
          kind={session.kind as ActivityKind} 
          className="h-full"
        />
        
        {/* Top actions */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pt-safe">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 rounded-full bg-surface/80 backdrop-blur-md border border-line flex items-center justify-center text-ink hover:bg-surface transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <button 
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-surface/80 backdrop-blur-md border border-line flex items-center justify-center text-ink hover:bg-surface transition-colors shadow-sm"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        
        {/* Badges on cover */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          <div className="flex gap-2">
            <div className="bg-surface/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-line flex items-center gap-1.5 shadow-1">
              <Calendar className="w-4 h-4 text-brand" />
              <span className="text-sm font-semibold text-ink">{dateStr}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-6">
        {/* Title and Category */}
        <div className="flex justify-between items-start gap-4 mb-4">
          <h1 className="type-title text-ink leading-tight">
            {session.title}
          </h1>
          <div className="bg-elevated px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap text-ink border border-line">
            {category?.emoji} {category?.name}
          </div>
        </div>

        {/* Date and Time Details */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-brand" />
            </div>
            <div>
              <p className="text-xs text-ink-muted font-medium">Horário</p>
              <p className="text-sm font-bold text-ink">{timeStr} ({session.duration_minutes} min)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-brand" />
            </div>
            <div>
              <p className="text-xs text-ink-muted font-medium">Local</p>
              <p className="text-sm font-bold text-ink">{session.location_name || 'A confirmar'}</p>
            </div>
          </div>
        </div>

        {/* Pro Block */}
        <div 
          onClick={() => navigate(`/pro/${pro.public_slug}`)}
          className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-line mb-8 active:scale-[.98] transition-transform cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Avatar src={pro.avatar_url} name={pro.full_name} className="w-12 h-12" />
            <div>
              <div className="flex items-center gap-1">
                <h3 className="type-title">{pro.full_name}</h3>
                {pro.credential_verified && (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                )}
              </div>
              <RatingBadge rating={pro.rating_avg} count={pro.total_reviews} className="mt-0.5" />
            </div>
          </div>
          <ArrowLeft className="w-5 h-5 text-slate rotate-180" />
        </div>

        {/* Description */}
        {session.description && (
          <div className="mb-8">
            <h3 className="type-subtitle text-ink mb-2">Sobre a atividade</h3>
            <p className="text-ink-muted leading-relaxed text-sm whitespace-pre-wrap">
              {session.description}
            </p>
          </div>
        )}

        {/* Requirements */}
        {session.what_to_bring && (
          <div className="mb-8">
            <h3 className="type-subtitle text-ink mb-3">O que levar</h3>
            <ul className="space-y-2">
              {session.what_to_bring.split(/\n|,/).map((req: string, i: number) => req.trim() ? (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-muted">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                  <span>{req.trim()}</span>
                </li>
              ) : null)}
            </ul>
          </div>
        )}

        {/* Spots Meter */}
        <div className="mb-8 p-5 bg-surface border border-line rounded-2xl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="type-title">Ocupação</h3>
            {isFull ? (
              <StatusPill text="Lotada" variant="danger" />
            ) : spotsLeft <= 3 ? (
              <StatusPill text={`Restam ${spotsLeft}`} variant="alert" />
            ) : (
              <span className="text-sm font-semibold text-ink-muted">{spotsLeft} vagas livres</span>
            )}
          </div>
          <SpotsMeter current={session.current_participants || 0} max={session.max_participants || 1} />
          <div className="flex justify-between items-center mt-2 text-xs text-ink-muted">
            <span>{session.current_participants} confirmados</span>
            <span>Máx. {session.max_participants}</span>
          </div>
        </div>

        {/* Policies */}
        <div className="mb-4">
          <h3 className="type-subtitle text-ink mb-2">Política de Cancelamento</h3>
          <p className="text-sm text-ink-muted leading-relaxed">
            Cancelamentos podem ser feitos com reembolso integral até 4 horas antes do início da atividade.
            Em caso de chuva forte que inviabilize a prática (para atividades ao ar livre), a atividade será remarcada ou reembolsada.
          </p>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-line p-4 pb-safe z-40">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex flex-col">
            <span className="text-xs text-ink-muted font-medium mb-0.5">Valor da vaga</span>
            <PriceTag amount={session.price_per_slot} />
          </div>
          <Button 
            variant="primary" 
            size="lg" 
            className="w-[180px] shadow-[var(--shadow-cta)]"
            onClick={handleBook}
            disabled={isFull}
          >
            {isFull ? 'Atividade Lotada' : 'Garantir Vaga'}
          </Button>
        </div>
      </div>

      {isCheckoutOpen && (
        <CheckoutModal 
          isOpen={isCheckoutOpen} 
          onClose={() => setIsCheckoutOpen(false)} 
          session={session}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
};
export default SessionDetails;
