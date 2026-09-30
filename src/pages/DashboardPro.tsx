import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Share2, Wallet, Users, Calendar, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { PageContainer } from '@/components/layout/PageContainer';
import { useProfile } from '@/hooks/useProfile';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useViewMode } from '@/contexts/ViewModeContext';
import { Button } from '@/components/ui/button';
import { EmptyState, StatusPill } from '@/components/domain';

export default function DashboardPro() {
  const { profile } = useProfile();
  const { data, isLoading } = useDashboardMetrics();
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { setViewMode } = useViewMode();


  if (isLoading) {
    return (
      <PageContainer title="Visão Geral" withBottomNav rightAction={<Button 
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 px-3 rounded-full border-line text-ink"
              onClick={() => {
                setViewMode('student');
                navigate('/feed');
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Ver como Participante
            </Button>}>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
      </PageContainer>
    );
  }

  const metrics: { total_revenue: number; unique_students: number; total_bookings: number; total_sessions: number; } = (data?.metrics as any) || {
    total_revenue: 0,
    unique_students: 0,
    total_bookings: 0,
    total_sessions: 0
  };
  
  const todaySessions = data?.todaySessions || [];
  const publicSlug = profile?.public_slug || profile?.id;
  const publicUrl = `${import.meta.env.VITE_PUBLIC_URL || window.location.origin}/@${publicSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('Link copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Atividades com ${profile?.full_name}`,
        text: 'Garanta sua vaga nas minhas próximas atividades!',
        url: publicUrl,
      }).catch(console.error);
    } else {
      handleCopyLink();
    }
  };

  return (
    <PageContainer title="Visão Geral" withBottomNav rightAction={<Button 
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 px-3 rounded-full border-line text-ink"
              onClick={() => {
                setViewMode('student');
                navigate('/feed');
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Ver como Participante
            </Button>}>
      <div className="px-6 py-6 flex-1 flex flex-col space-y-8 pb-32">
        
        {/* Hoje */}
        <section>
          <h2 className="type-subtitle mb-4">Hoje</h2>
          {todaySessions.length === 0 ? (
            <EmptyState 
              title="Dia livre!" 
              description="Você não tem atividades marcadas para hoje."
              icon={Calendar}
            />
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session: any) => (
                <div key={session.id} className="bg-surface border border-line rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-display font-bold text-ink leading-tight">{session.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-ink-muted">
                        <span>{session.start_time.substring(0,5)}</span>
                        <span>·</span>
                        <span>{session.location_name}</span>
                      </div>
                    </div>
                    {session.status === 'full' ? (
                      <StatusPill text="Lotada" variant="danger" />
                    ) : (
                      <StatusPill text={`${session.current_participants}/${session.max_participants} alunos`} variant="info" />
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-1">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => navigate(`/session/${session.id}/attendance`)}
                    >
                      Encerrar Atividade
                    </Button>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => navigate(`/session/${session.id}`)}
                    >
                      Detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Share Banner (Link Público) */}
        <section>
          <div className="bg-surface rounded-2xl p-5 border border-brand/30 shadow-1 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex" style={{
              background: 'repeating-linear-gradient(45deg, transparent 0 10px, var(--brand) 10px 12px)'
            }} />
            <div className="relative z-10">
              <h3 className="type-subtitle text-brand mb-1">Seu Link Público</h3>
              <p className="text-sm text-ink-muted mb-4 max-w-[280px]">
                Coloque este link na bio do seu Instagram para receber reservas automáticas.
              </p>
              <div className="flex gap-2">
                <div className="h-12 bg-elevated rounded-xl px-4 flex items-center flex-1 font-mono text-sm border border-line truncate select-all text-ink">
                  riff.pro/@{publicSlug}
                </div>
                <Button 
                  variant="primary"
                  onClick={handleCopyLink}
                  className="shrink-0 font-semibold w-12 p-0"
                >
                  {copied ? <CheckCircle2 className="w-5 h-5 text-bg" /> : <Link2 className="w-5 h-5 text-bg" />}
                </Button>
                <Button 
                  variant="secondary"
                  onClick={handleShare}
                  className="shrink-0 w-12 p-0"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* KPI Grid */}
        <section>
          <h2 className="type-subtitle mb-4">Métricas (Todo o período)</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface border border-line rounded-2xl p-4 flex flex-col shadow-sm">
              <div className="flex items-center gap-2 text-ink-muted mb-2">
                <Wallet className="w-4 h-4 text-slate" />
                <span className="type-label">Receita</span>
              </div>
              <div className="mt-auto">
                <span className="text-sm text-accent font-bold mr-1">R$</span>
                <span className="type-number text-2xl text-ink">
                  {metrics.total_revenue.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-2xl p-4 flex flex-col shadow-sm">
              <div className="flex items-center gap-2 text-ink-muted mb-2">
                <Users className="w-4 h-4 text-slate" />
                <span className="type-label">Participantes Únicos</span>
              </div>
              <div className="mt-auto">
                <span className="type-number text-2xl text-ink">
                  {metrics.unique_students}
                </span>
              </div>
            </div>
            
            <div className="bg-surface border border-line rounded-2xl p-4 flex flex-col shadow-sm">
              <div className="flex items-center gap-2 text-ink-muted mb-2">
                <CheckCircle2 className="w-4 h-4 text-slate" />
                <span className="type-label">Reservas</span>
              </div>
              <div className="mt-auto">
                <span className="type-number text-2xl text-ink">
                  {metrics.total_bookings}
                </span>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-2xl p-4 flex flex-col shadow-sm">
              <div className="flex items-center gap-2 text-ink-muted mb-2">
                <Calendar className="w-4 h-4 text-slate" />
                <span className="type-label">Atividades Realizadas</span>
              </div>
              <div className="mt-auto">
                <span className="type-number text-2xl text-ink">
                  {metrics.total_sessions}
                </span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </PageContainer>
  );
}
