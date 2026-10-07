import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link2, Share2, Calendar, Loader2, CheckCircle2, RefreshCw, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { HeroHeader } from '@riff/core/layout/HeroHeader';
import { BRAND } from '@/brand';
import { useProfile } from '@riff/core/hooks/useProfile';
import { Button } from '@riff/core/ui/button';
import { BrandLines, EmptyState, TicketGrid } from '@riff/core/domain';
import { formatBRL } from '@riff/core/lib/money';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useViewMode } from '@/contexts/ViewModeContext';
import { GettingStarted, PixMissingBanner } from '@/components/dashboard/GettingStarted';
import { InsightsCard } from '@/components/dashboard/InsightsCard';
import { useProfessionalInsights } from '@/hooks/useProfessionalInsights';
import { ModeSwitcher } from '@/components/layout/ModeSwitcher';
import { ProSessionRow } from '@/components/cards/ProSessionRow';

const SHARED_KEY = 'riff-link-shared';
const readShared = () => {
  try {
    return localStorage.getItem(SHARED_KEY) === '1';
  } catch {
    return false;
  }
};

export default function DashboardPro() {
  const { profile } = useProfile();
  const { data, isLoading } = useDashboardMetrics();
  const { data: insights } = useProfessionalInsights();
  const [copied, setCopied] = useState(false);
  const [hasSharedLink, setHasSharedLink] = useState(readShared);
  const navigate = useNavigate();
  const { setViewMode } = useViewMode();


  const switchToParticipant = (
    <button
      type="button"
      onClick={() => {
        setViewMode('student');
        navigate('/feed');
      }}
      className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-bg/50 backdrop-blur-sm border border-line text-xs font-semibold text-ink"
    >
      <RefreshCw className="w-3.5 h-3.5" /> Participante
    </button>
  );

  if (isLoading) {
    return (
      <PageContainer withBottomNav>
        <HeroHeader topLeft={<ModeSwitcher />} topRight={switchToParticipant} label="Painel do organizador" />
        <div className="flex-1 flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
      </PageContainer>
    );
  }

  const metrics: { total_revenue: number; unique_students: number; total_bookings: number; total_sessions: number } =
    (data?.metrics as { total_revenue: number; unique_students: number; total_bookings: number; total_sessions: number }) || {
      total_revenue: 0,
      unique_students: 0,
      total_bookings: 0,
      total_sessions: 0,
    };
  const todaySessions = data?.todaySessions || [];
  const nextSession = data?.nextSession;
  const publicSlug = profile?.public_slug || profile?.id;
  const publicUrl = `${import.meta.env.VITE_PUBLIC_URL || window.location.origin}/@${publicSlug}`;
  const firstName = profile?.full_name?.split(' ')[0];

  const markShared = () => {
    setHasSharedLink(true);
    try {
      localStorage.setItem(SHARED_KEY, '1');
    } catch {
      // armazenamento indisponível: o passo só não fica marcado
    }
  };

  const handleCopyLink = () => {
    markShared();
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('Link copiado. Cole na bio do Instagram ou no WhatsApp.');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShare = () => {
    markShared();
    if (navigator.share) {
      navigator
        .share({ title: `Atividades com ${profile?.full_name}`, text: `Oi! Estas são as minhas próximas atividades no Riff Sports. Escolha uma e garanta sua vaga:`, url: publicUrl })
        .catch(() => undefined);
    } else {
      handleCopyLink();
    }
  };

  return (
    <PageContainer withBottomNav>
      <HeroHeader
        overlap
        topLeft={<ModeSwitcher />}
        topRight={switchToParticipant}
        label="Painel do organizador"
        title={`Olá${firstName ? `, ${firstName}` : ''}!`}
        subtitle={
          todaySessions.length
            ? `Hoje você tem ${todaySessions.length} atividade${todaySessions.length > 1 ? 's' : ''}.`
            : nextSession
              ? `Próxima: ${nextSession.title}, ${format(parseISO(nextSession.date), "EEEE, d 'de' MMM", { locale: ptBR })} às ${nextSession.start_time.substring(0, 5)}.`
              : 'Crie uma atividade e compartilhe seu link.'
        }
      />

      {/* Números (todo o período) */}
      <TicketGrid
        items={[
          { label: 'Receita', value: <span className="text-accent">{formatBRL(metrics.total_revenue)}</span> },
          { label: 'Participantes', value: metrics.unique_students },
          { label: 'Reservas abertas', value: metrics.total_bookings },
        ]}
        footer={
          <span className="text-ink-muted">
            {metrics.total_sessions} atividade{metrics.total_sessions === 1 ? '' : 's'} criada{metrics.total_sessions === 1 ? '' : 's'} ·{' '}
            <button type="button" onClick={() => navigate('/earnings')} className="text-brand font-semibold">
              Ver ganhos
            </button>
          </span>
        }
      />

      <div className="px-4 py-6 flex-1 flex flex-col space-y-6 pb-32">
        {profile && !profile.pix_key && <PixMissingBanner />}

        <GettingStarted profile={profile} totalSessions={metrics.total_sessions} hasSharedLink={hasSharedLink} onShare={handleShare} />

        {/* Hoje */}
        <section className="space-y-2">
          <div className="flex items-baseline justify-between px-2">
            <h2 className="type-subtitle">Hoje</h2>
            <span className="text-xs text-ink-muted">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
          </div>
          {todaySessions.length === 0 ? (
            nextSession ? (
              <div className="space-y-2">
                <p className="text-sm text-ink-muted px-2">Dia livre. Sua próxima atividade:</p>
                <ProSessionRow session={nextSession} showDay highlight />
              </div>
            ) : (
              <EmptyState
                title="Nenhuma atividade marcada"
                description="Crie a próxima e compartilhe o link com seus participantes."
                icon={Calendar}
                action={{ label: 'Criar atividade', onClick: () => navigate('/create-session') }}
              />
            )
          ) : (
            <div className="space-y-2">
              {todaySessions.map((session) => (
                <ProSessionRow
                  key={session.id}
                  session={session}
                  highlight
                  action={
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => navigate(`/session/${session.id}/attendance`)}>
                      <ClipboardCheck className="w-4 h-4 mr-2" /> Inscritos e presença
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Link público */}
        <section className="relative overflow-hidden bg-surface rounded-2xl p-5 border border-brand/40">
          <BrandLines className="absolute inset-y-0 right-0 h-full w-1/2 opacity-60" />
          <div className="relative">
            <p className="type-label text-brand">Seu link público</p>
            <h3 className="type-subtitle mt-1">Coloque na bio e receba reservas</h3>
            <p className="text-sm text-ink-muted mt-1 max-w-[260px]">Quem abre vê suas próximas atividades e reserva direto.</p>
            <div className="flex gap-2 mt-4">
              <div className="h-12 bg-elevated rounded-xl px-4 flex items-center flex-1 font-mono text-sm border border-line truncate select-all text-ink">
                {BRAND.domain}/@{publicSlug}
              </div>
              <Button variant="primary" onClick={handleCopyLink} className="shrink-0 w-12 p-0" aria-label="Copiar link">
                {copied ? <CheckCircle2 className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
              </Button>
              <Button variant="secondary" onClick={handleShare} className="shrink-0 w-12 p-0" aria-label="Compartilhar link">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>

        {insights && <InsightsCard insights={insights} />}
      </div>
    </PageContainer>
  );
}
