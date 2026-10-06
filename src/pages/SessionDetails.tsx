import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, ChevronRight, ClipboardCheck, MapPin, Pencil, Share2, Ticket } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@riff/core/supabase/client';
import { useAuth } from '@riff/core/hooks/useAuth';
import { useProfile } from '@riff/core/hooks/useProfile';
import { HeroHeader, HeroIconButton } from '@riff/core/layout/HeroHeader';
import { StickyActions } from '@riff/core/layout/StickyActions';
import { Avatar, PriceTag, RatingBadge, SportIcon, SpotsMeter, StatusPill, TicketGrid } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { KINDS, type ActivityKind } from '@riff/core/lib/copy';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';

const SessionDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
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

  // Reserva da própria pessoa nesta atividade (se houver)
  const { data: myBooking } = useQuery({
    queryKey: ['session', id, 'my-booking', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, status, payment_status')
        .eq('session_id', id!)
        .eq('student_id', profile!.id)
        .is('dependent_id', null)
        .in('status', ['pending', 'confirmed'])
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!profile?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
        <h2 className="type-title mb-2">Atividade não encontrada</h2>
        <p className="text-ink-muted mb-6">Esta atividade pode ter sido cancelada ou removida.</p>
        <Button onClick={() => navigate(-1)} variant="secondary">
          Voltar
        </Button>
      </div>
    );
  }

  const pro = session.professional;
  const category = session.category;
  const kind = KINDS[session.kind as ActivityKind];
  const max = session.max_participants || 0;
  const current = session.current_participants || 0;
  const spotsLeft = Math.max(0, max - current);
  const isFull = spotsLeft <= 0 || session.status === 'full';
  const isOrganizer = !!profile?.id && profile.id === session.professional_id;
  const date = parseISO(session.date);

  const handleShare = async () => {
    const text = `${session.title} com ${pro.full_name?.split(' ')[0] ?? 'o organizador'}: ${format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}, às ${session.start_time.substring(0, 5)}. Bora?`;
    if (navigator.share) {
      try {
        await navigator.share({ title: session.title, text, url: window.location.href });
      } catch {
        // a pessoa fechou a janela de compartilhar
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      toast.success('Link copiado. Cole no WhatsApp ou na bio.');
    } catch {
      toast.error('Não foi possível copiar o link.');
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
    <div className="min-h-screen bg-bg pb-40">
      <HeroHeader
        overlap
        showBack
        imageUrl={session.cover_image_url}
        topRight={
          <HeroIconButton label="Compartilhar" onClick={handleShare}>
            <Share2 className="w-5 h-5" />
          </HeroIconButton>
        }
      >
        <div className="flex flex-wrap gap-2 mt-1">
          <StatusPill text={kind?.chip ?? 'Atividade'} variant="neutral" />
          {isOrganizer && <StatusPill text="Você organiza" variant="info" />}
          {myBooking && (
            <StatusPill text={myBooking.payment_status === 'pending' ? 'Aguardando pagamento' : 'Reserva confirmada'} variant={myBooking.payment_status === 'pending' ? 'alert' : 'success'} />
          )}
        </div>
        <h1 className="type-display leading-tight mt-3">{session.title}</h1>
        {category?.name && (
          <p className="flex items-center gap-1.5 text-sm text-ink-muted mt-2">
            <SportIcon slug={category.slug} className="w-4 h-4 text-brand" /> {category.name}
          </p>
        )}
      </HeroHeader>

      {/* Ingresso: dia, horário e local */}
      <TicketGrid
        items={[
          { label: format(date, 'EEEEEE', { locale: ptBR }), value: format(date, 'd'), sub: format(date, 'MMMM', { locale: ptBR }) },
          { label: 'Horário', value: session.start_time.substring(0, 5), sub: session.duration_minutes ? `${session.duration_minutes} min` : undefined },
          { label: 'Local', icon: MapPin, value: '', sub: <span className="text-ink">{session.location_name || 'A confirmar'}</span> },
        ]}
      />

      <div className="px-6 py-6 space-y-6">
        {/* Vagas e preço */}
        <section className="bg-surface border border-line rounded-2xl p-4 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="type-label">Vagas</p>
              <p className="text-sm text-ink-muted">
                <span className="type-display text-brand">{current}</span> de {max} confirmados
              </p>
            </div>
            <StatusPill
              text={isFull ? 'Lotada' : `${spotsLeft} livre${spotsLeft === 1 ? '' : 's'}`}
              variant={isFull ? 'danger' : spotsLeft <= 2 ? 'alert' : 'success'}
            />
          </div>
          <SpotsMeter current={current} max={max || 1} />
        </section>

        {/* Quem organiza */}
        <Link
          to={pro.public_slug ? `/pro/${pro.public_slug}` : '#'}
          className="flex items-center gap-3 bg-surface border border-line rounded-2xl p-4 active:scale-[.99] transition-transform"
        >
          <Avatar src={pro.avatar_url} name={pro.full_name} className="w-12 h-12" />
          <div className="min-w-0 flex-1">
            <p className="type-label">Quem organiza</p>
            <p className="flex items-center gap-1 text-sm font-semibold text-ink truncate">
              {pro.full_name}
              {pro.credential_verified && <CheckCircle2 className="w-4 h-4 text-success shrink-0" />}
            </p>
            <RatingBadge rating={pro.rating_avg} count={pro.total_reviews} className="mt-0.5" />
          </div>
          <ChevronRight className="w-5 h-5 text-ink-muted" />
        </Link>

        {session.description && (
          <section className="space-y-2">
            <h2 className="type-subtitle">Sobre a atividade</h2>
            <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">{session.description}</p>
          </section>
        )}

        {session.what_to_bring && (
          <section className="space-y-2">
            <h2 className="type-subtitle">O que levar</h2>
            <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
              {session.what_to_bring
                .split(/\n|,/)
                .map((req: string) => req.trim())
                .filter(Boolean)
                .map((req: string) => (
                  <li key={req} className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" /> {req}
                  </li>
                ))}
            </ul>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="type-subtitle">Pagamento, cancelamento e responsabilidade</h2>
          <p className="text-sm text-ink-muted leading-relaxed">
            Esta atividade é organizada e de responsabilidade de quem a publicou. O pagamento é feito direto ao organizador, e
            cancelamento, remarcação e reembolso são combinados com ele. Pelo app, você pode cancelar a reserva até 4 horas antes do
            início.{' '}
            <Link to="/termos" className="text-brand underline underline-offset-4">
              Termos de Uso
            </Link>
          </p>
        </section>
      </div>

      {/* Ações fixas */}
      <StickyActions>
        {isOrganizer ? (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => navigate(`/edit-session/${session.id}`)}>
              <Pencil className="w-4 h-4 mr-2" /> Editar
            </Button>
            <Button className="flex-1" onClick={() => navigate(`/session/${session.id}/attendance`)}>
              <ClipboardCheck className="w-4 h-4 mr-2" /> Inscritos e presença
            </Button>
          </div>
        ) : myBooking ? (
          <Button size="lg" variant="secondary" className="w-full" onClick={() => navigate('/my-bookings')}>
            <Ticket className="w-4 h-4 mr-2" /> Ver minha reserva
          </Button>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-ink-muted">Valor da vaga</span>
              <PriceTag amount={session.price_per_slot} />
            </div>
            <Button size="lg" className="flex-1 max-w-[200px] shadow-[var(--shadow-cta)]" onClick={handleBook} disabled={isFull}>
              {isFull ? 'Lotada' : 'Garantir vaga'}
            </Button>
          </div>
        )}
      </StickyActions>

      {isCheckoutOpen && (
        <CheckoutModal screen="session" isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} session={session} onSuccess={() => {}} />
      )}
    </div>
  );
};
export default SessionDetails;
