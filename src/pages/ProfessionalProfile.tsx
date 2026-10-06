import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Star, CheckCircle2, AlertCircle, Share2, AtSign } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { BRAND } from '@/brand';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { SessionRow } from '@/components/cards/SessionRow';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { Button } from '@riff/core/ui/button';
import { HeroHeader, HeroIconButton } from '@riff/core/layout/HeroHeader';
import { StickyActions } from '@riff/core/layout/StickyActions';
import { Avatar, RatingBadge, EmptyState, TicketGrid } from '@riff/core/domain';
import type { SessionWithJoins } from '@/types/session';

export default function ProfessionalProfile() {
  const { slug, handle } = useParams<{ slug?: string, handle?: string }>();
  const navigate = useNavigate();
  const queryParam = slug || (handle?.startsWith('@') ? handle.substring(1) : '');
  const { data, isLoading, error } = usePublicProfile(queryParam);
  
  const [selectedSession, setSelectedSession] = useState<NonNullable<typeof sessions>[number] | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  if (handle && !handle.startsWith('@')) return <Navigate to="/404" replace />;
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-bg flex flex-col items-center justify-center p-6 text-center">
        <EmptyState 
          icon={AlertCircle}
          title="Erro ao carregar perfil"
          description="Ocorreu um erro ao buscar os dados deste organizador. O banco de dados pode estar indisponível."
          action={{ label: 'Tentar novamente', onClick: () => window.location.reload() }}
        />
      </div>
    );
  }
  if (!data?.profile) {
    return (
      <div className="min-h-[100dvh] bg-bg flex flex-col items-center justify-center p-6 text-center">
        <EmptyState 
          title="Perfil não encontrado" 
          description="Este organizador não existe ou alterou seu link."
          action={{ label: 'Ir para Home', onClick: () => navigate('/') }}
        />
      </div>
    );
  }

  const { profile, sessions, reviews } = data;
  const specialties = Array.isArray(profile.specialties) ? profile.specialties : [];
  type Review = { id: string; rating: number; comment: string | null; reviewer?: { full_name?: string | null; avatar_url?: string | null } | null };

  const handleBookClick = (session: NonNullable<typeof sessions>[number]) => {
    setSelectedSession(session);
    setIsCheckoutOpen(true);
  };

  // Próxima atividade com vaga
  const nextSession = sessions.find(
    (s: NonNullable<typeof sessions>[number]) => (s.current_participants ?? 0) < (s.max_participants ?? 0) && s.status !== 'full',
  );

  const handleShare = async () => {
    const url = window.location.href;
    const text = `Veja as próximas atividades de ${profile.full_name} e reserve sua vaga:`;
    if (navigator.share) {
      try {
        await navigator.share({ title: profile.full_name ?? BRAND.name, text, url });
      } catch {
        // a pessoa fechou a janela de compartilhar
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-bg text-ink pb-32 w-full max-w-[480px] mx-auto overflow-x-hidden relative">
      <Helmet>
        <title>{`${profile.full_name} | ${BRAND.name}`}</title>
        <meta name="description" content={profile.bio || 'Confira os horários disponíveis e reserve sua vaga online.'} />
        <meta property="og:image" content={profile.avatar_url || `https://${BRAND.domain}${BRAND.ogImage}`} />
      </Helmet>

      <HeroHeader
        overlap
        showBack
        contentClassName="text-center"
        topRight={
          <HeroIconButton label="Compartilhar" onClick={handleShare}>
            <Share2 className="w-5 h-5" />
          </HeroIconButton>
        }
      >
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Avatar src={profile.avatar_url} name={profile.full_name} className="w-24 h-24 ring-4 ring-bg" fallbackClassName="text-3xl" />
            {profile.credential_verified && (
              <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-success text-bg flex items-center justify-center ring-4 ring-surface" title="Registro verificado">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            )}
          </div>
          <h1 className="type-title leading-tight">{profile.full_name}</h1>
          <p className="text-xs text-ink-muted">
            {[profile.credential_number ? `${profile.credential_type ?? ''} ${profile.credential_number}`.trim() : null, profile.city]
              .filter(Boolean)
              .join(' · ') || 'Organizador'}
          </p>
          {(specialties.length > 0 || profile.instagram_handle) && (
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {specialties.map((spec: string) => (
                <span key={spec} className="px-3 h-7 rounded-full bg-elevated border border-line text-xs font-semibold text-ink-muted flex items-center first-letter:uppercase">
                  {spec}
                </span>
              ))}
              {profile.instagram_handle && (
                <a
                  href={`https://instagram.com/${profile.instagram_handle.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 h-7 rounded-full bg-brand/15 border border-brand/40 text-xs font-semibold text-brand flex items-center gap-1"
                >
                  <AtSign className="w-3.5 h-3.5" /> {profile.instagram_handle.replace(/^@/, '')}
                </a>
              )}
            </div>
          )}
        </div>
      </HeroHeader>

      <TicketGrid
        items={[
          {
            label: 'Nota',
            value: (profile.total_reviews ?? 0) > 0 ? (profile.rating_avg ?? 0).toFixed(1).replace('.', ',') : '—',
            sub: `${profile.total_reviews ?? 0} ${profile.total_reviews === 1 ? 'avaliação' : 'avaliações'}`,
          },
          { label: 'Atividades', value: profile.total_sessions_given || 0, sub: 'realizadas' },
          { label: 'Participantes', value: profile.total_students_served || 0, sub: 'atendidos' },
        ]}
      />

      <div className="py-6 space-y-6">
        {profile.bio && (
          <section className="mx-4 bg-surface border border-line rounded-2xl p-4 space-y-2">
            <h2 className="type-label">Sobre</h2>
            <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
          </section>
        )}

        <section className="space-y-2">
          <div className="flex items-baseline justify-between px-6">
            <h2 className="type-subtitle">Próximas atividades</h2>
            <span className="text-xs text-ink-muted">{sessions.length}</span>
          </div>
          {sessions.length === 0 ? (
            <div className="px-4">
              <EmptyState title="Nenhuma atividade programada" description="Volte mais tarde ou siga no Instagram para saber das próximas." />
            </div>
          ) : (
            <div className="mx-4 bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
              {sessions.map((session: NonNullable<typeof sessions>[number]) => (
                <SessionRow key={session.id} session={session as unknown as SessionWithJoins} showDay />
              ))}
            </div>
          )}
        </section>

        {reviews.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between px-6">
              <h2 className="type-subtitle">Avaliações</h2>
              <RatingBadge rating={profile.rating_avg} count={profile.total_reviews} showCount={false} />
            </div>
            <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-3 px-4 pb-2">
              {(reviews as Review[]).map((review) => (
                <div key={review.id} className="snap-center w-[280px] shrink-0 bg-surface rounded-2xl p-4 border border-line flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={review.reviewer?.avatar_url} name={review.reviewer?.full_name} className="w-10 h-10" />
                    <div>
                      <p className="text-sm font-semibold text-ink">{review.reviewer?.full_name?.split(' ')[0] || 'Participante'}</p>
                      <div className="flex gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`w-3 h-3 ${star <= review.rating ? 'fill-brand text-brand' : 'fill-line text-line'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-ink-muted leading-relaxed flex-1">"{review.comment}"</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {nextSession && (
        <StickyActions>
          <Button size="lg" className="w-full shadow-[var(--shadow-cta)]" onClick={() => handleBookClick(nextSession)}>
            Reservar: {nextSession.title}
          </Button>
          <p className="text-xs text-center text-ink-muted first-letter:uppercase">
            {format(parseISO(nextSession.date), "EEEE, d 'de' MMM", { locale: ptBR })} às {nextSession.start_time.substring(0, 5)}
          </p>
        </StickyActions>
      )}

      {isCheckoutOpen && (
        <CheckoutModal
          screen="profile"
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          session={selectedSession as unknown as SessionWithJoins}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
