import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Frown, Laugh, Meh, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@riff/core/hooks/useProfile';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { Avatar, BrandLines, EmptyState } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { cn } from '@riff/core/lib/utils';
import { usePendingReviews, usePlayerProfile, useSubmitReview, type PendingReview } from '@/hooks/useSports';
import { ACHIEVEMENTS, KUDOS, POINTS, type KudosTag } from '@/lib/sports';
import { whenLabel } from '@/lib/dates';

const VIBES = [
  { value: 1 as const, label: 'Fraco', icon: Frown },
  { value: 2 as const, label: 'Ok', icon: Meh },
  { value: 3 as const, label: 'Muito bom', icon: Laugh },
];

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
          <p className="type-label">Pós-jogo · {step} de 3</p>
        </div>
      </section>
      <div className="px-6 py-6 space-y-6">{children}</div>
    </PageContainer>
  );
}

// Avaliação pós-jogo em três toques: como foi, quem mandou bem, recompensa
export default function GameReview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: pending, isLoading } = usePendingReviews();
  const item = pending?.find((p) => p.session_id === sessionId);

  if (isLoading) {
    return (
      <Shell step={1}>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </Shell>
    );
  }
  if (!item) {
    return (
      <Shell step={1}>
        <EmptyState
          icon={Trophy}
          title="Nada para avaliar aqui"
          description="Este jogo já foi avaliado ou o prazo acabou. As avaliações ficam abertas por 3 dias depois do jogo."
        />
        <Link to="/inicio" className="block text-center text-sm text-brand underline underline-offset-4">
          Voltar aos eventos
        </Link>
      </Shell>
    );
  }
  return <ReviewFlow item={item} />;
}

function ReviewFlow({ item }: { item: PendingReview }) {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const submit = useSubmitReview();
  const queryClient = useQueryClient();
  // ao sair da avaliação, atualiza a lista de jogos pendentes
  useEffect(() => () => void queryClient.invalidateQueries({ queryKey: ['pending-reviews'] }), [queryClient]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [vibe, setVibe] = useState<1 | 2 | 3 | null>(null);
  const [tag, setTag] = useState<KudosTag>('craque');
  const [given, setGiven] = useState<Record<string, KudosTag[]>>({});
  const [sentKudos, setSentKudos] = useState(0);
  const { data: me } = usePlayerProfile(step === 3 ? profile?.id : undefined, item.organization_id);

  const toggle = (playerId: string) =>
    setGiven((prev) => {
      const tags = prev[playerId] ?? [];
      return { ...prev, [playerId]: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag] };
    });

  const send = async (v: 1 | 2 | 3, withKudos: boolean) => {
    const kudos = withKudos
      ? Object.entries(given).flatMap(([receiver, tags]) => tags.map((t) => ({ receiver, tag: t })))
      : [];
    try {
      await submit.mutateAsync({ sessionId: item.session_id, vibe: v, kudos });
      setSentKudos(kudos.length);
      setStep(3);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a avaliação.');
    }
  };

  const pickVibe = (v: 1 | 2 | 3) => {
    setVibe(v);
    if (item.players.length === 0) void send(v, false);
    else setStep(2);
  };

  if (step === 1) {
    return (
      <Shell step={1}>
        <div className="space-y-1">
          <h1 className="type-title">Como foi o {item.title} {whenLabel(item.date)}?</h1>
          <p className="text-sm text-ink-muted">Um toque e já vamos para o próximo passo.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {VIBES.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => pickVibe(v.value)}
              disabled={submit.isPending}
              className={cn(
                'flex flex-col items-center gap-2 rounded-2xl border py-5 text-sm font-semibold transition-all active:scale-95',
                vibe === v.value ? 'bg-brand text-brand-ink border-brand' : 'bg-surface border-line text-ink',
              )}
            >
              <v.icon className="w-9 h-9" strokeWidth={1.5} />
              {v.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-muted">Só quem organizou e o gestor veem esta resposta. Ela ajuda a melhorar os próximos jogos.</p>
      </Shell>
    );
  }

  if (step === 2) {
    const total = Object.values(given).reduce((n, t) => n + t.length, 0);
    return (
      <Shell step={2}>
        <div className="space-y-1">
          <h1 className="type-title">Quem mandou bem?</h1>
          <p className="text-sm text-ink-muted">Escolha o elogio e toque em quem merece. Pode dar mais de um.</p>
        </div>

        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Elogio">
          {KUDOS.map((k) => (
            <button
              key={k.tag}
              type="button"
              role="radio"
              aria-checked={tag === k.tag}
              onClick={() => setTag(k.tag)}
              className={cn(
                'h-9 px-3 rounded-full text-sm font-medium border flex items-center gap-1.5 transition-colors',
                tag === k.tag ? 'bg-brand text-brand-ink border-brand' : 'bg-surface border-line text-ink-muted',
              )}
            >
              <k.icon className="w-4 h-4" /> {k.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {item.players.map((p) => {
            const tags = given[p.id] ?? [];
            const active = tags.includes(tag);
            return (
              <button key={p.id} type="button" onClick={() => toggle(p.id)} aria-pressed={active} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                <Avatar
                  src={p.avatar_url}
                  name={p.name}
                  className={cn('w-16 h-16 ring-2 transition-all', active ? 'ring-brand' : tags.length ? 'ring-brand/40' : 'ring-transparent')}
                  fallbackClassName="text-lg"
                />
                <span className="text-xs font-medium text-ink truncate max-w-full">{p.name}</span>
                <span className="text-xs text-brand min-h-4 truncate max-w-full">
                  {tags.map((t) => KUDOS.find((k) => k.tag === t)?.label).join(' · ')}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-ink-muted bg-surface border border-line rounded-xl px-3 py-2">
          Os elogios aparecem no perfil de quem recebeu e valem pontos no ranking. Ninguém vê quem deu.
        </p>

        <div className="space-y-2">
          <Button size="lg" className="w-full" onClick={() => vibe && send(vibe, true)} disabled={submit.isPending || !vibe}>
            {submit.isPending ? 'Enviando…' : total ? `Enviar ${total} elogio${total > 1 ? 's' : ''}` : 'Concluir sem elogios'}
          </Button>
        </div>
      </Shell>
    );
  }

  // Passo 3: recompensa e próximo objetivo
  const next = (me?.achievements ?? [])
    .filter((a) => a.current < a.target)
    .sort((a, b) => b.current / b.target - a.current / a.target)[0];
  const meta = next ? ACHIEVEMENTS[next.key] : null;

  return (
    <Shell step={3}>
      <div className="text-center space-y-2 pt-2">
        <div className="w-16 h-16 rounded-full bg-brand/15 text-brand flex items-center justify-center mx-auto">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="type-display">+{POINTS.review} pontos</h1>
        <p className="text-sm text-ink-muted">
          por avaliar{sentKudos > 0 ? ` · você deu ${sentKudos} elogio${sentKudos > 1 ? 's' : ''}` : ''}
          . Quem jogou também soma +{POINTS.presence} pela presença.
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

      {me?.month_rank ? (
        <p className="text-center text-sm text-ink">
          Você está em <span className="text-brand font-bold">{me.month_rank}º</span> no ranking deste mês, com {me.month_points} pontos.
        </p>
      ) : null}

      <div className="space-y-2">
        <Button size="lg" className="w-full" onClick={() => navigate('/inicio', { replace: true })}>
          Ver próximos eventos
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => navigate('/perfil', { replace: true })}>
          Ver meu perfil
        </Button>
      </div>
    </Shell>
  );
}
