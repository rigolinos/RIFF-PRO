import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Star, Camera, Share2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

import { usePublicProfile } from '@/hooks/usePublicProfile';
import { SessionCard } from '@/components/cards/SessionCard';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, CoverImage, RatingBadge, EmptyState } from '@/components/domain';

export default function ProfessionalProfile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = usePublicProfile(slug || '');
  
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  if (isLoading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center">Carregando...</div>;
  }

  if (error || !data?.profile) {
    return (
      <div className="min-h-[100dvh] bg-bg flex flex-col items-center justify-center p-6 text-center">
        <EmptyState 
          title="Perfil não encontrado" 
          description="Este profissional não existe ou alterou seu link."
          action={{ label: 'Ir para Home', onClick: () => navigate('/') }}
        />
      </div>
    );
  }

  const { profile, sessions, reviews } = data;
  const specialties = Array.isArray(profile.specialties) ? profile.specialties : []; 
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleBookClick = (session: any) => {
    setSelectedSession(session);
    setIsCheckoutOpen(true);
  };

  const handleInstagram = () => {
    if (!profile.instagram_handle) return;
    const handle = profile.instagram_handle.replace('@', '');
    window.open(`https://instagram.com/${handle}`, '_blank');
  };
  
  // Find the next available session to reserve
  const nextSession = sessions.find((s: any) => s.current_participants < s.max_participants && s.status !== 'full');

  return (
    <div className="min-h-[100dvh] bg-bg text-ink pb-28 w-full max-w-[480px] mx-auto overflow-x-hidden relative">
      <Helmet>
        <title>{profile.full_name} | Riff Pro</title>
        <meta name="description" content={profile.bio || "Confira os horários disponíveis e reserve sua vaga online."} />
        <meta property="og:image" content={profile.avatar_url || 'https://riff.pro/og-image.jpg'} />
      </Helmet>

      {/* Header with Cover */}
      <div className="relative h-48 md:h-56">
        <CoverImage className="h-full" />
        
        {/* Top actions */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pt-safe">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 rounded-full bg-surface/80 backdrop-blur-md border border-line flex items-center justify-center text-ink hover:bg-surface transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-6 -mt-16 relative z-10 flex flex-col items-center text-center">
        <div className="relative mb-3">
          <Avatar src={profile.avatar_url} name={profile.full_name} className="w-28 h-28 border-[6px] border-bg text-3xl" />
          {profile.credential_verified && (
            <div className="absolute bottom-1 right-1 bg-success rounded-full p-1.5 shadow-sm border-[3px] border-bg">
              <CheckCircle2 className="w-4 h-4 text-bg" />
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold font-display text-ink leading-tight flex items-center justify-center gap-2 mb-1">
          {profile.full_name}
        </h1>
        
        {profile.credential_number && (
          <p className="text-xs text-ink-muted font-medium mb-3 uppercase tracking-wider flex items-center justify-center gap-1">
            {profile.credential_type} {profile.credential_number}
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {specialties.map((spec: string, i: number) => (
            <Badge key={i} variant="secondary" className="capitalize border border-line bg-surface font-semibold text-ink-muted">
              {spec}
            </Badge>
          ))}
        </div>

        {/* Social Proof Line */}
        <div className="flex items-center justify-center gap-6 w-full max-w-sm mb-8">
          {(profile.total_reviews ?? 0) > 0 && (
            <>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-ink font-display text-lg">{(profile.rating_avg ?? 0).toFixed(1).replace('.', ',')}</span>
                  <Star className="w-4 h-4 fill-brand text-brand" />
                </div>
                <span className="text-xs text-ink-muted uppercase tracking-wider font-semibold">Avaliações</span>
              </div>
              <div className="w-px h-8 bg-line" />
            </>
          )}
          <div className="flex flex-col items-center">
            <span className="font-bold text-ink font-display text-lg">{profile.total_sessions_given || 0}</span>
            <span className="text-xs text-ink-muted uppercase tracking-wider font-semibold">Aulas Dadas</span>
          </div>
          <div className="w-px h-8 bg-line" />
          <div className="flex flex-col items-center">
            <span className="font-bold text-ink font-display text-lg">{profile.total_students_served || 0}</span>
            <span className="text-xs text-ink-muted uppercase tracking-wider font-semibold">Alunos</span>
          </div>
        </div>

        {/* Bio / Metodologia */}
        {profile.bio && (
          <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap mb-8 text-center px-4">
            {profile.bio}
          </p>
        )}
      </div>

      <div className="px-5 mb-8">
        <h2 className="font-display font-bold text-xl text-ink mb-4">Próximas aulas</h2>
        {sessions.length === 0 ? (
          <EmptyState 
            title="Nenhuma aula programada" 
            description="O profissional ainda não possui turmas abertas." 
          />
        ) : (
          <div className="space-y-4">
            {sessions.map((session: any) => (
              <SessionCard key={session.id} session={session} onBookClick={handleBookClick} />
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="px-5 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl text-ink">Avaliações</h2>
            <RatingBadge rating={profile.rating_avg} count={profile.total_reviews} showCount={false} />
          </div>
          <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-4 -mx-5 px-5 gap-4">
            {reviews.map((review: any) => (
              <div key={review.id} className="snap-center w-[280px] shrink-0 bg-surface rounded-2xl p-5 border border-line flex flex-col shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar src={review.reviewer?.avatar_url} name={review.reviewer?.full_name} className="w-10 h-10" />
                  <div>
                    <h4 className="font-semibold text-sm text-ink">{review.reviewer?.full_name?.split(' ')[0] || 'Aluno'}</h4>
                    <div className="flex gap-0.5 mt-0.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} className={`w-3 h-3 ${star <= review.rating ? 'fill-brand text-brand' : 'fill-line text-line'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-ink-muted leading-relaxed flex-1">"{review.comment}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fixed CTA */}
      {nextSession && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-line p-4 pb-safe z-40">
          <div className="flex justify-center max-w-md mx-auto">
            <Button 
              variant="primary" 
              size="lg" 
              className="w-full shadow-[var(--shadow-cta)] font-semibold"
              onClick={() => handleBookClick(nextSession)}
            >
              Reservar Próxima Aula
            </Button>
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <CheckoutModal 
          isOpen={isCheckoutOpen} 
          onClose={() => setIsCheckoutOpen(false)} 
          session={selectedSession}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
