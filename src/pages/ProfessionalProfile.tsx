import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ShieldCheck, Star, MapPin, Camera, Share2, ArrowLeft, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

import { usePublicProfile } from '@/hooks/usePublicProfile';
import { SessionCard } from '@/components/cards/SessionCard';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ProfessionalProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = usePublicProfile(slug || '');
  
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>;
  }

  if (error || !data?.profile) {
    return (
      <div className="min-h-[100dvh] bg-bg flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold font-display text-ink mb-2">Perfil não encontrado</h2>
        <p className="text-ink-muted mb-6">Este profissional não existe ou alterou seu link.</p>
        <Button onClick={() => navigate('/')}>Ir para a Home</Button>
      </div>
    );
  }

  const { profile, sessions, reviews } = data;

  const handleBookClick = (session: any) => {
    setSelectedSession(session);
    setIsCheckoutOpen(true);
  };



  const handleInstagram = () => {
    if (!profile.instagram_handle) return;
    const handle = profile.instagram_handle.replace('@', '');
    window.open(`https://instagram.com/${handle}`, '_blank');
  };

  // Convert array of strings or raw text into tags
  const specialties = Array.isArray(profile.specialties) ? profile.specialties : []; 
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-[100dvh] bg-bg text-ink pb-12 w-full max-w-[480px] mx-auto overflow-x-hidden relative">
      <Helmet>
        <title>{profile.full_name} | Aulas e Treinos no Riff Pro</title>
        <meta name="description" content="Confira os horários disponíveis e reserve sua vaga online." />
        <meta property="og:title" content={`${profile.full_name} | Aulas e Treinos no Riff Pro`} />
        <meta property="og:description" content="Confira os horários disponíveis e reserve sua vaga online." />
        <meta property="og:image" content={profile.avatar_url || 'https://riff.pro/og-image.jpg'} />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:type" content="profile" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* Back Button Overlay */}
      <Button 
        variant="ghost"
        size="icon"
        onClick={() => navigate(-1)} 
        className="absolute top-4 left-4 z-50 rounded-full bg-surface/50 backdrop-blur-md shadow-1"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>

      {/* Header Profile */}
      <div className="pt-12 px-6 pb-6 flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-brand to-accent/80">
            <div className="w-full h-full rounded-full bg-surface overflow-hidden border-2 border-surface">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-bg font-display text-2xl font-bold">
                  {profile.full_name.charAt(0)}
                </div>
              )}
            </div>
          </div>
          {profile.credential_verified && (
            <div className="absolute -bottom-2 -right-2 bg-bg rounded-full p-1">
              <div className="bg-success rounded-full p-1.5 shadow-sm text-white">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold font-display text-ink leading-tight flex items-center justify-center gap-2">
          {profile.full_name}
        </h1>
        {profile.credential_number && (
          <p className="text-xs text-ink-muted font-medium mt-1 uppercase tracking-wider flex items-center justify-center gap-1">
            {profile.credential_type} {profile.credential_number}
            {profile.credential_verified && <ShieldCheck className="w-3.5 h-3.5 text-success" />}
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {specialties.map((spec: string, i: number) => (
            <Badge key={i} variant="secondary" className="capitalize">
              {spec}
            </Badge>
          ))}
        </div>

        {/* Social Proof Line */}
        <div className="flex items-center justify-center gap-4 mt-6 w-full max-w-sm">
          {(profile.total_reviews ?? 0) > 0 && (
            <>
              <div className="flex flex-col items-center flex-1">
                <div className="flex items-center gap-1 text-accent">
                  <Star className="w-4 h-4 fill-accent" />
                  <span className="font-bold text-ink font-display">{(profile.rating_avg ?? 0).toFixed(1)}</span>
                </div>
                <span className="text-xs text-ink-muted uppercase mt-0.5">{profile.total_reviews} reviews</span>
              </div>
              <div className="w-px h-8 bg-line" />
            </>
          )}
          <div className="flex flex-col items-center flex-1">
            <span className="font-bold text-ink font-display">{profile.total_sessions_given || 0}</span>
            <span className="text-xs text-ink-muted uppercase mt-0.5">Aulas dadas</span>
          </div>
          <div className="w-px h-8 bg-line" />
          <div className="flex flex-col items-center flex-1">
            <span className="font-bold text-ink font-display">{profile.total_students_served || 0}</span>
            <span className="text-xs text-ink-muted uppercase mt-0.5">Alunos</span>
          </div>
        </div>
      </div>

      {/* Section: Próximas Turmas */}
      <div className="mt-2">
        <div className="px-6 mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Turmas Abertas
          </h2>
          <span className="text-xs text-success bg-success/15 px-2 py-0.5 rounded-md font-medium">
            {sessions.length} ativas
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="mx-6 p-6 rounded-2xl border border-white/5 bg-white/[0.02] text-center">
            <h3 className="text-sm font-semibold text-foreground mb-2">Sem Turmas Abertas</h3>
            <p className="text-sm text-muted-foreground">Nenhuma aula programada no momento.</p>
          </div>
        ) : (
          <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory px-6 pb-4 -mx-6">
            <div className="flex gap-4 px-6 w-max">
              {sessions.map((session: any) => (
                <div key={session.id} className="snap-center w-[300px]">
                  <SessionCard session={session} onBookClick={handleBookClick} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bento Grid: Metodologia & Socials */}
      <div className="px-6 mt-6 grid grid-cols-2 gap-3">
        {/* Bio / Metodologia */}
        {profile.bio && (
          <div className="col-span-2 bg-surface border border-line rounded-2xl p-5 shadow-1">
            <h3 className="text-sm font-semibold text-brand mb-2">Sobre</h3>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Social Actions */}
        <button 
          onClick={() => {
            const url = window.location.href;
            if (navigator.share) {
              navigator.share({ title: profile.full_name, url });
            } else {
              navigator.clipboard.writeText(url);
              toast.success('Link do perfil copiado!');
            }
          }}
          className="bg-brand/5 border border-brand/20 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-brand/10 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
            <Share2 className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-brand">Compartilhar</span>
        </button>

        <button 
          onClick={handleInstagram}
          disabled={!profile.instagram_handle}
          className="bg-surface border border-line rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-1"
        >
          <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-ink-muted">
            <Camera className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-ink-muted">Instagram</span>
        </button>
      </div>

      {/* Reviews Feed */}
      {reviews.length > 0 && (
        <div className="mt-8 mb-4">
          <div className="px-6 mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider">
              O que dizem os alunos
            </h2>
            {(profile.rating_avg ?? 0) > 0 && (
              <Badge variant="pill" className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-brand" />
                <span className="tabular-nums">{(profile.rating_avg ?? 0).toFixed(1)}</span>
              </Badge>
            )}
          </div>
          
          <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory px-6 pb-6 -mx-6">
            <div className="flex gap-4 px-6 w-max">
              {reviews.map((review: any) => (
                <div key={review.id} className="snap-center w-[280px] bg-surface rounded-2xl p-5 border border-line flex flex-col h-full shadow-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-bg overflow-hidden border border-line shrink-0">
                        {review.reviewer?.avatar_url ? (
                          <img src={review.reviewer.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-ink-muted">
                            {review.reviewer?.full_name?.charAt(0) || 'A'}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink leading-none">{review.reviewer?.full_name?.split(' ')[0]}</p>
                        <p className="text-xs text-ink-muted mt-1.5 uppercase">{format(parseISO(review.created_at), "MMM yyyy", { locale: ptBR })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 bg-surface shadow-sm px-2 py-0.5 rounded-full border border-line">
                      <Star className="w-3 h-3 fill-accent text-accent" />
                      <span className="text-xs font-bold text-ink">{review.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  {review.tags && review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {review.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="pill" className="text-[9px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {review.comment && (
                    <p className="text-sm text-foreground/80 italic leading-relaxed">
                      "{review.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reusable Checkout Drawer */}
      <CheckoutModal 
        session={selectedSession}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={() => setIsCheckoutOpen(false)}
      />
    </div>
  );
};

export default ProfessionalProfile;
