import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, ChevronRight, ClipboardCheck, Flag, Lock, MapPin, Navigation, Pencil, Share2, Ticket } from 'lucide-react';

import { supabase } from '@riff/core/supabase/client';
import { useAuth } from '@riff/core/hooks/useAuth';
import { useProfile } from '@riff/core/hooks/useProfile';
import { HeroHeader, HeroIconButton } from '@riff/core/layout/HeroHeader';
import { StickyActions } from '@riff/core/layout/StickyActions';
import { Avatar, PriceTag, RatingBadge, SportIcon, SpotsMeter, StatusPill, TicketGrid } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { KINDS, type ActivityKind } from '@riff/core/lib/copy';
import { activityPhase, nowSP, PHASE_LABEL } from '@riff/core/lib/activityTime';
import { googleMapsUrl, hasCoordinates, wazeUrl } from '@riff/core/lib/geo';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { useProParticipants } from '@/hooks/useSportsProfile';
import { shareActivity } from '@/lib/share';

const SessionDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const queryClient = useQueryClient();

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

  // Quem vai: fotos e nomes só para quem reservou e quem organiza
  const { data: going } = useProParticipants(id);
  const [now] = useState(nowSP);

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
  // Inscrição só antes do início e com a atividade ativa (mesma regra do create_booking)
  const phase = activityPhase(session, now);
  const place = { latitude: session.latitude, longitude: session.longitude, name: session.location_name, address: session.location_address };
  const closed = phase === 'open' ? null : PHASE_LABEL[phase];
  const date = parseISO(session.date);

  const handleShare = () =>
    void shareActivity(session, { isOwner: isOrganizer, organizerFirstName: pro.full_name?.split(' ')[0] });


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
          {closed && <StatusPill text={closed.pill} variant={phase === 'live' ? 'alert' : 'danger'} />}
          {isOrganizer && <StatusPill text="Você organiza" variant="info" />}
          {myBooking && (
            <StatusPill text={myBooking.payment_status === 'pending' ? 'Aguardando pagamento' : 'Reserva confirmada'} variant={myBooking.payment_status === 'pending' ? 'alert' : 'success'} />
          )}
        </div>
        <h1 className="type-display leading-tight mt-3">{session.title}</h1>
        {(session.sport_other || category?.name) && (
          <p className="flex items-center gap-1.5 text-sm text-ink-muted mt-2">
            <SportIcon slug={session.sport_other ? 'outros' : category?.slug} className="w-4 h-4 text-brand" /> {session.sport_other || category?.name}
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
            {closed ? (
              <StatusPill text="Inscrições fechadas" variant="neutral" />
            ) : (
              <StatusPill
                text={isFull ? 'Lotada' : `${spotsLeft} livre${spotsLeft === 1 ? '' : 's'}`}
                variant={isFull ? 'danger' : spotsLeft <= 2 ? 'alert' : 'success'}
              />
            )}
          </div>
          <SpotsMeter current={current} max={max || 1} />
          {going && going.count > 0 && (
            <div className="border-t border-line pt-3 space-y-2">
              <p className="type-label">Quem vai</p>
              {going.people ? (
                <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-1 px-1">
                  {going.people.map((p, i) => (
                    <div key={p.id ?? `reservado-${i}`} className="flex flex-col items-center gap-1 w-14 shrink-0">
                      <Avatar src={p.avatar_url} name={p.name} className="w-11 h-11" fallbackClassName="text-xs" />
                      <span className="text-xs text-ink-muted truncate max-w-full">{p.id === profile?.id ? 'Você' : p.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="flex items-center gap-2 text-xs text-ink-muted">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  {going.count} {going.count === 1 ? 'pessoa já reservou' : 'pessoas já reservaram'}. Reserve para ver quem vai.
                </p>
              )}
            </div>
          )}
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

        {/* Onde é: endereço, ponto de encontro e como chegar */}
        {session.location_name && (
          <section className="space-y-2">
            <h2 className="type-subtitle">Onde é</h2>
            <div className="bg-surface border border-line rounded-2xl overflow-hidden">
              <div className="p-4 space-y-1.5">
                <p className="flex items-start gap-2 text-sm font-semibold text-ink">
                  <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" /> {session.location_name}
                </p>
                {session.location_address && <p className="text-xs text-ink-muted pl-6">{session.location_address}</p>}
                {session.meeting_point && (
                  <p className="flex items-start gap-2 text-sm text-ink pt-1">
                    <Flag className="w-4 h-4 text-accent shrink-0 mt-0.5" /> {session.meeting_point}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 border-t border-line divide-x divide-line">
                {[
                  { label: 'Google Maps', href: googleMapsUrl(place) },
                  { label: 'Waze', href: wazeUrl(place) },
                ].map((a) => (
                  <a
                    key={a.label}
                    href={a.href}
                    target="_blank"
                    rel="noreferrer"
                    className="h-11 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand active:bg-elevated"
                  >
                    <Navigation className="w-4 h-4" /> {a.label}
                  </a>
                ))}
              </div>
            </div>
            {!hasCoordinates(place) && <p className="text-xs text-ink-muted px-1">O "Como chegar" usa o endereço escrito pelo organizador.</p>}
          </section>
        )}

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
            {!closed && (
              <Button variant="secondary" className="flex-1" onClick={() => navigate(`/edit-session/${session.id}`)}>
                <Pencil className="w-4 h-4 mr-2" /> Editar
              </Button>
            )}
            <Button className="flex-1" onClick={() => navigate(`/session/${session.id}/attendance`)}>
              <ClipboardCheck className="w-4 h-4 mr-2" /> Inscritos e presença
            </Button>
          </div>
        ) : myBooking ? (
          <Button size="lg" variant="secondary" className="w-full" onClick={() => navigate(`/my-bookings?ingresso=${myBooking.id}`)}>
            <Ticket className="w-4 h-4 mr-2" /> Ver minha reserva
          </Button>
        ) : closed ? (
          <div className="space-y-2">
            <p className="text-sm text-ink-muted text-center">{closed.message}</p>
            <Button
              size="lg"
              variant="secondary"
              className="w-full"
              onClick={() => navigate(pro.public_slug ? `/pro/${pro.public_slug}` : '/feed')}
            >
              {pro.public_slug ? `Ver próximas de ${pro.full_name?.split(' ')[0] ?? 'quem organiza'}` : 'Ver outras atividades'}
            </Button>
          </div>
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
        <CheckoutModal
          screen="session"
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          session={session}
          onSuccess={() => {
            void queryClient.invalidateQueries({ queryKey: ['session', id] });
            void queryClient.invalidateQueries({ queryKey: ['pro-participants', id] });
          }}
        />
      )}
    </div>
  );
};
export default SessionDetails;
