import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, PartyPopper, Star } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { Avatar, BrandLines, EmptyState } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { Textarea } from '@riff/core/ui/textarea';
import { cn } from '@riff/core/lib/utils';
import { chipClass } from '@riff/core/lib/chips';
import { whenLabel } from '@riff/core/lib/dates';
import { ACHIEVEMENTS, nextAchievement } from '@riff/core/lib/achievements';
import { useBookings } from '@/hooks/useBookings';
import { useMySportsProfile, useSubmitProReview } from '@/hooks/useSportsProfile';
import { canReview, ORGANIZER_TAGS, RATING_LABELS } from '@/lib/reviews';

type Booking = NonNullable<ReturnType<typeof useBookings>['bookings']>[number];

function Shell({ step, children }: { step: number; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <PageContainer withBottomNav={false}>
      <section className="relative overflow-hidden bg-surface border-b border-line pb-6">
        <BrandLines className="absolute inset-y-0 right-0 h-full w-3/4" />
        <div className="relative px-6 pt-safe">
          <div className="h-16 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="w-10 h-10 -ml-2 rounded-full bg-bg/50 backdrop-blur-sm flex items-center justify-center text-ink active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-1.5" aria-label={`Passo ${step} de 3`}>
              {[1, 2, 3].map((i) => (
                <span key={i} className={cn('h-1.5 rounded-full transition-all', i <= step ? 'w-6 bg-brand' : 'w-3 bg-line')} />
              ))}
            </div>
          </div>
          <p className="type-label">Avaliação · {step} de 3</p>
        </div>
      </section>
      <div className="px-6 py-6 space-y-6">{children}</div>
    </PageContainer>
  );
}

function Stars({ rating, size, onPick }: { rating: number; size: 'lg' | 'sm'; onPick: (n: number) => void }) {
  return (
    <div className={cn('flex', size === 'lg' ? 'justify-between' : 'gap-1')} role="radiogroup" aria-label="Nota">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={rating === n}
          aria-label={`${n} de 5: ${RATING_LABELS[n]}`}
          onClick={() => onPick(n)}
          className="p-1 active:scale-90 transition-transform"
        >
          <Star className={cn(size === 'lg' ? 'w-12 h-12' : 'w-6 h-6', n <= rating ? 'fill-brand text-brand' : 'text-line')} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}

// Avaliação do organizador em três toques: nota, destaques, agradecimento
export default function ReviewActivity() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { bookings, isLoading } = useBookings();
  const [now] = useState(() => Date.now());
  const booking = bookings?.find((b) => b.id === bookingId);
  // depois de enviar, a reserva deixa de ser avaliável: a tela de agradecimento continua
  const [done, setDone] = useState(false);

  if (isLoading) {
    return (
      <Shell step={1}>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </Shell>
    );
  }
  if (!booking || (!done && !canReview(booking, now))) {
    return (
      <Shell step={1}>
        <EmptyState
          icon={Star}
          title="Nada para avaliar aqui"
          description="Esta atividade já foi avaliada ou ainda não terminou. A avaliação abre quando a atividade acaba."
        />
        <Link to="/my-bookings" className="block text-center text-sm text-brand underline underline-offset-4">
          Ver minhas reservas
        </Link>
      </Shell>
    );
  }
  return <ReviewFlow booking={booking} onDone={() => setDone(true)} />;
}

function ReviewFlow({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submit = useSubmitProReview();
  // ao sair, atualiza as reservas (o convite "Como foi?" some)
  useEffect(() => () => void queryClient.invalidateQueries({ queryKey: ['bookings', 'student'] }), [queryClient]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const { data: me } = useMySportsProfile();

  const organizer = booking.professional?.full_name?.split(' ')[0] ?? 'o organizador';

  const pick = (n: number) => {
    setRating(n);
    setStep(2);
  };

  const toggle = (tag: string) => setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const send = async () => {
    try {
      await submit.mutateAsync({
        bookingId: booking.id,
        sessionId: booking.session_id,
        professionalId: booking.professional_id,
        rating,
        tags,
        comment,
      });
      onDone();
      setStep(3);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a avaliação.');
    }
  };

  if (step === 1) {
    return (
      <Shell step={1}>
        <div className="flex items-center gap-3">
          <Avatar src={booking.professional?.avatar_url} name={booking.professional?.full_name} className="w-14 h-14 shrink-0" />
          <div className="min-w-0">
            <h1 className="type-title leading-tight">
              Como foi {booking.session.title} {whenLabel(booking.session.date)}?
            </h1>
            <p className="text-sm text-ink-muted">com {organizer}</p>
          </div>
        </div>
        <Stars rating={rating} size="lg" onPick={pick} />
        <p className="text-xs text-ink-muted">Um toque e já vamos para o próximo passo. A nota aparece no perfil de {organizer}.</p>
      </Shell>
    );
  }

  if (step === 2) {
    return (
      <Shell step={2}>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Stars rating={rating} size="sm" onPick={setRating} />
            <span className="text-sm font-semibold text-brand">{RATING_LABELS[rating]}</span>
          </div>
          <h1 className="type-title">O que se destacou?</h1>
          <p className="text-sm text-ink-muted">Marque o que quiser. Ajuda quem ainda está escolhendo.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {ORGANIZER_TAGS.map((t) => (
            <button
              key={t.tag}
              type="button"
              aria-pressed={tags.includes(t.tag)}
              onClick={() => toggle(t.tag)}
              className={cn(chipClass(tags.includes(t.tag)), 'inline-flex items-center gap-1.5')}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label htmlFor="review-comment" className="type-label">
            Quer contar mais? (opcional)
          </label>
          <Textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            placeholder={`O que você diria para quem vai treinar com ${organizer}?`}
            className="resize-none h-24"
          />
          <p className="text-xs text-ink-muted">O comentário aparece no perfil público, com seu primeiro nome e sua foto.</p>
        </div>

        <Button size="lg" className="w-full" onClick={send} disabled={submit.isPending}>
          {submit.isPending ? 'Enviando…' : 'Enviar avaliação'}
        </Button>
      </Shell>
    );
  }

  // Passo 3: agradecimento e próxima conquista
  const next = nextAchievement(me?.achievements);
  const meta = next ? ACHIEVEMENTS[next.key] : null;

  return (
    <Shell step={3}>
      <div className="text-center space-y-2 pt-2">
        <div className="w-16 h-16 rounded-full bg-brand/15 text-brand flex items-center justify-center mx-auto">
          <PartyPopper className="w-8 h-8" />
        </div>
        <h1 className="type-title">Valeu pela avaliação!</h1>
        <p className="text-sm text-ink-muted">
          Ela ajuda {organizer} a melhorar e quem está escolhendo onde treinar.
          {me?.games ? ` Você já foi a ${me.games} atividade${me.games === 1 ? '' : 's'} pelo Riff.` : ''}
        </p>
      </div>

      {next && meta && (
        <div className="bg-surface border border-line rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              <meta.icon className="w-4 h-4 text-brand" /> {meta.title}
            </span>
            <span className="text-xs text-ink-muted">
              {next.current} de {next.target}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
            <div className="h-1.5 rounded-full bg-brand" style={{ width: `${Math.round((next.current / next.target) * 100)}%` }} />
          </div>
          <p className="text-xs text-ink-muted">
            Faltam {next.target - next.current} {meta.hint(next.detail)}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Button size="lg" className="w-full" onClick={() => navigate('/feed', { replace: true })}>
          Ver próximas atividades
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => navigate('/profile/edit#esportista', { replace: true })}>
          Ver meu perfil esportista
        </Button>
      </div>
    </Shell>
  );
}
