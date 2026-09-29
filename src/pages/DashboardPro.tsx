import { Link, useNavigate } from 'react-router-dom';

import { format, parseISO } from 'date-fns';

import { ptBR } from 'date-fns/locale';

import { Link2, Share2, Wallet, Users, LayoutDashboard, Calendar, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

import { useState } from 'react';

import { toast } from 'sonner';



import { PageContainer } from '@/components/layout/PageContainer';

import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';

import { useProfile } from '@/hooks/useProfile';

import { useViewMode } from '@/contexts/ViewModeContext';

import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';



const DashboardPro = () => {

  const { profile } = useProfile();

  const { data, isLoading } = useDashboardMetrics();

  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();



  const { setViewMode } = useViewMode();

  

  const ModeSwitch = () => (

    <Button 

      variant="pill"

      size="sm"

      className="gap-1.5 h-8 px-3"

      onClick={() => {

        setViewMode('student');

        navigate('/feed');

      }}

    >

      <RefreshCw className="w-3 h-3" /> Ver como Aluno

    </Button>

  );



  if (isLoading) {

    return (

      <PageContainer title="Visão Geral" withBottomNav rightAction={<ModeSwitch />}>

        <div className="flex-1 flex items-center justify-center">

          <Loader2 className="w-8 h-8 text-brand animate-spin" />

        </div>

      </PageContainer>

    );

  }



  const metrics = (data?.metrics as any) || {

    total_revenue: 0,

    unique_students: 0,

    total_bookings: 0,

    total_sessions: 0

  };

  const nextSession = data?.nextSession;



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

        title: `Aulas com ${profile?.full_name}`,

        text: 'Garanta sua vaga nas minhas próximas aulas!',

        url: publicUrl,

      }).catch(console.error);

    } else {

      handleCopyLink();

    }

  };



  // Taxa de ocupação (simplificada, usaríamos a métrica real do backend na Fase 2)

  const occupancyRate = metrics.total_sessions > 0 && metrics.total_bookings > 0

    ? Math.min(100, Math.round((metrics.total_bookings / (metrics.total_sessions * 10)) * 100))

    : 0;



  return (

    <PageContainer title="Visão Geral" withBottomNav rightAction={<ModeSwitch />}>

      <div className="px-6 py-6 flex-1 flex flex-col space-y-6">



        {/* Share Banner (The most important action) */}

        <div className="bg-surface rounded-2xl p-5 border border-brand/30 shadow-[0_4px_24px_rgba(11,107,79,0.1)] relative overflow-hidden">

          <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 blur-3xl rounded-full" />

          

          <h3 className="text-sm font-semibold text-brand mb-1">Seu Link Público</h3>

          <p className="text-xs text-ink-muted mb-4 max-w-[250px]">

            Coloque este link na bio do seu Instagram para receber reservas automáticas.

          </p>



          <div className="flex gap-2">

            <div className="h-12 bg-bg rounded-xl px-4 flex items-center flex-1 font-mono text-xs border border-line truncate select-all text-ink">

              riff.pro/@{publicSlug}

            </div>

            <Button 

              onClick={handleCopyLink}

              className="shrink-0 font-medium"

            >

              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}

              {copied ? 'Copiado' : 'Copiar'}

            </Button>

            <Button 

              variant="secondary"

              size="icon"

              onClick={handleShare}

              className="shrink-0"

            >

              <Share2 className="w-4 h-4" />

            </Button>

          </div>

        </div>



        {/* KPI Grid */}

        <div className="grid grid-cols-2 gap-3">

          <div className="bg-surface border border-line rounded-2xl shadow-1 p-4 flex flex-col">

            <div className="flex items-center gap-2 text-ink-muted mb-2">

              <Wallet className="w-4 h-4" />

              <span className="text-xs font-medium uppercase tracking-wider">Receita (Mês)</span>

            </div>

            <div className="mt-auto">

              <span className="text-sm text-brand font-bold mr-1">R$</span>

              <span className="text-2xl font-bold text-ink">

                {metrics.total_revenue.toFixed(2).replace('.', ',')}

              </span>

            </div>

          </div>



          <div className="grid grid-rows-2 gap-3">

            <div className="bg-surface border border-line rounded-2xl shadow-1 p-3 flex flex-col justify-center relative overflow-hidden">

              <div className="flex items-center gap-2 text-ink-muted mb-1 z-10">

                <Users className="w-3.5 h-3.5" />

                <span className="text-[10px] font-medium uppercase tracking-wider">Alunos Únicos</span>

              </div>

              <span className="text-xl font-bold text-ink z-10">{metrics.unique_students}</span>

              <Users className="absolute -bottom-2 -right-2 w-12 h-12 text-ink/5" />

            </div>



            <div className="bg-surface border border-line rounded-2xl shadow-1 p-3 flex flex-col justify-center relative overflow-hidden">

              <div className="flex items-center gap-2 text-ink-muted mb-1 z-10">

                <LayoutDashboard className="w-3.5 h-3.5" />

                <span className="text-[10px] font-medium uppercase tracking-wider">Vagas Preenchidas</span>

              </div>

              <div className="flex items-baseline gap-1 z-10">

                <span className="text-xl font-bold text-ink">

                  {metrics.total_bookings}

                </span>

              </div>

            </div>

          </div>

        </div>



        {/* Next Session Highlight */}

        <div>

          <div className="flex items-center justify-between mb-3">

            <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider">

              Agenda Imediata

            </h2>

            <Link to="/my-sessions" className="text-xs text-brand font-medium flex items-center gap-1">

              Ver todas <ArrowRight className="w-3 h-3" />

            </Link>

          </div>



          {nextSession ? (

            <Link to="/my-sessions" className="block">

              <div className="bg-surface border border-line rounded-2xl shadow-1 p-4 border-brand/20 bg-surface hover:bg-brand/10 transition-colors relative overflow-hidden">

                <div className="absolute top-0 left-0 w-1 h-full bg-brand" />

                <div className="flex justify-between items-start">

                  <div>

                    <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-1 rounded-md uppercase tracking-wider mb-2 inline-block">

                      Próxima Aula

                    </span>

                    <h3 className="font-bold text-lg text-ink mb-1">

                      {nextSession.title}

                    </h3>

                    <div className="flex items-center gap-2 text-sm text-ink-muted">

                      <Calendar className="w-4 h-4" />

                      <span className="capitalize">

                        {format(parseISO(nextSession.date), "EEE, dd/MM", { locale: ptBR })} Ã s {nextSession.start_time.substring(0, 5)}

                      </span>

                    </div>

                  </div>

                  <div className="w-12 h-12 rounded-full border-4 border-brand/20 flex items-center justify-center flex-col">

                    <span className="text-sm font-bold text-brand leading-none">

                      {nextSession.current_participants || 0}

                    </span>

                  </div>

                </div>

              </div>

            </Link>

          ) : (

            <div className="bg-surface border border-line rounded-2xl shadow-1 p-6 text-center border-dashed border-2 border-white/10">

              <Calendar className="w-8 h-8 text-ink-muted mx-auto mb-2 opacity-50" />

              <p className="text-sm text-ink font-medium mb-1">Agenda vazia</p>

              <p className="text-xs text-ink-muted mb-4">Você não tem aulas marcadas para os próximos dias.</p>

              <Link to="/create-session" className="text-xs font-semibold text-black bg-brand px-4 py-2 rounded-lg inline-block">

                Criar Nova Aula

              </Link>

            </div>

          )}

        </div>



      </div>

    </PageContainer>

  );

};



export default DashboardPro;







