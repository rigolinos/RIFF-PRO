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

const ProfessionalProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = usePublicProfile(slug || '');
  
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  }

  if (error || !data?.profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">Perfil não encontrado</h2>
        <p className="text-muted-foreground mb-6">Este profissional não existe ou alterou seu link.</p>
        <button onClick={() => navigate('/')} className="h-12 px-6 bg-emerald-500 text-black font-semibold rounded-xl">Ir para a Home</button>
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
  const specialties = profile.specialties || ['Funcional', 'Saúde e Bem-Estar']; 
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-screen bg-background pb-12 w-full max-w-[480px] mx-auto overflow-x-hidden relative">
      <Helmet>
        <title>{profile.full_name} | Aulas e Treinos no Riff Pro</title>
        <meta name="description" content="Confira os horários disponíveis e reserve sua vaga online." />
        <meta property="og:title" content={`${profile.full_name} | Aulas e Treinos no Riff Pro`} />
        <meta property="og:description" content="Confira os horários disponíveis e reserve sua vaga online." />
        <meta property="og:image" content={profile.avatar_url || 'https://via.placeholder.com/600x400/061D24/10B981?text=Riff+Pro'} />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:type" content="profile" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* Back Button Overlay */}
      <button 
        onClick={() => navigate(-1)} 
        className="absolute top-4 left-4 z-50 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Header Profile */}
      <div className="pt-12 px-6 pb-6 flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-emerald-500 to-emerald-200">
            <div className="w-full h-full rounded-full bg-background overflow-hidden border-2 border-background">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5 text-2xl font-bold">
                  {profile.full_name.charAt(0)}
                </div>
              )}
            </div>
          </div>
          {profile.credential_number && (
            <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1">
              <div className="bg-emerald-500 rounded-full p-1.5 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                <ShieldCheck className="w-4 h-4 text-black" />
              </div>
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-foreground leading-tight">
          {profile.full_name}
        </h1>
        {profile.credential_number && (
          <p className="text-xs text-emerald-400 font-medium mt-1 uppercase tracking-wider">
            {profile.credential_type} {profile.credential_number}
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {specialties.map((spec: string, i: number) => (
            <span key={i} className="px-3 py-1 bg-white/[0.04] border border-white/10 rounded-full text-xs text-muted-foreground font-medium">
              {spec}
            </span>
          ))}
        </div>

        {/* Social Proof Line */}
        <div className="flex items-center justify-center gap-4 mt-6 w-full max-w-sm">
          <div className="flex flex-col items-center flex-1">
            <div className="flex items-center gap-1 text-emerald-400">
              <Star className="w-4 h-4 fill-emerald-400" />
              <span className="font-bold">{profile.rating_avg > 0 ? profile.rating_avg.toFixed(1) : '5.0'}</span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase mt-0.5">{profile.total_reviews} reviews</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center flex-1">
            <span className="font-bold text-foreground">{profile.total_sessions_given || 0}</span>
            <span className="text-[10px] text-muted-foreground uppercase mt-0.5">Aulas dadas</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center flex-1">
            <span className="font-bold text-foreground">98%</span>
            <span className="text-[10px] text-muted-foreground uppercase mt-0.5">Presença</span>
          </div>
        </div>
      </div>

      {/* Section: Próximas Turmas */}
      <div className="mt-2">
        <div className="px-6 mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Turmas Abertas
          </h2>
          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-medium">
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
        <div className="col-span-2 glass-card p-5">
          <h3 className="text-sm font-semibold text-emerald-400 mb-2">Formação & Método</h3>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {profile.bio || "Foco em biomecânica, treinos adaptados à sua realidade e resultados sustentáveis. Sem dor, apenas evolução constante."}
          </p>
        </div>

        {/* O que está incluso */}
        <div className="col-span-2 glass-card p-5 border-emerald-500/10 bg-emerald-500/5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Na aula você tem:</h3>
          <ul className="space-y-2">
            {[
              "Equipamentos higienizados inclusos",
              "Acompanhamento biomecânico",
              "Treino adaptado para seu nível"
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <div className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>

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
          className="glass-card p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors border-emerald-500/20 bg-emerald-500/5"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Share2 className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-emerald-400">Compartilhar</span>
        </button>

        <button 
          onClick={handleInstagram}
          disabled={!profile.instagram_handle}
          className="glass-card p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400">
            <Camera className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-pink-400">Instagram</span>
        </button>
      </div>

      {/* Reviews Feed */}
      {reviews.length > 0 && (
        <div className="mt-8 mb-4">
          <div className="px-6 mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              O que dizem os alunos
            </h2>
            <div className="flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <Star className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              <span className="text-xs font-bold text-emerald-400 tabular-nums">{profile.rating_avg > 0 ? profile.rating_avg.toFixed(1) : '5.0'}</span>
            </div>
          </div>
          
          <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory px-6 pb-6 -mx-6">
            <div className="flex gap-4 px-6 w-max">
              {reviews.map((review: any) => (
                <div key={review.id} className="snap-center w-[280px] glass-card p-5 border border-white/5 bg-white/[0.02] flex flex-col h-full shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden border border-white/10 shrink-0">
                        {review.reviewer?.avatar_url ? (
                          <img src={review.reviewer.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                            {review.reviewer?.full_name?.charAt(0) || 'A'}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-none">{review.reviewer?.full_name?.split(' ')[0]}</p>
                        <p className="text-[10px] text-muted-foreground mt-1.5 uppercase">{format(parseISO(review.created_at), "MMM yyyy", { locale: ptBR })}</p>
                      </div>
                    </div>
                    <div className="flex items-center bg-black/40 px-1.5 py-0.5 rounded-full border border-white/5">
                      <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-400 ml-1">{review.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  {review.tags && review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {review.tags.map((tag: string, i: number) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-300 rounded-full border border-emerald-500/20 font-medium uppercase tracking-wider">
                          {tag}
                        </span>
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
