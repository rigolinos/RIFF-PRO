import { ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@riff/core/lib/utils';
import { Button } from '@riff/core/ui/button';

interface StepFlowProps {
  /** Nome do fluxo, acima do título ("Nova atividade") */
  label: string;
  /** Passo atual e total; sem isso, a tela é a revisão (barra cheia, sem "passo X de N") */
  progress?: { step: number; total: number };
  /** Texto abaixo do nome do fluxo, no lugar de "Passo X de N" (ex.: "Rascunho") */
  caption?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack: () => void;
  /** Ação principal, sempre à mão no rodapé */
  primary: { label: string; onClick: () => void; disabled?: boolean; loading?: boolean };
  /** Linha abaixo do botão: o que falta ou o que acontece depois */
  hint?: React.ReactNode;
  /** Muda a cada passo: anima a entrada do conteúdo */
  stepKey?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Moldura de um fluxo em passos (criar atividade, criar evento): uma pergunta por tela,
 * "Passo X de N" no topo e o botão principal fixo embaixo. Usada no Riff Pro e no Riff Clubes.
 */
export function StepFlow({ label, progress, caption, title, subtitle, onBack, primary, hint, stepKey, children, className }: StepFlowProps) {
  const percent = progress ? Math.round((progress.step / progress.total) * 100) : 100;
  return (
    <div className={cn('min-h-[100dvh] bg-bg text-ink flex flex-col w-full max-w-[480px] mx-auto overflow-x-hidden', className)}>
      <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur-xl border-b border-line px-4 pt-safe">
        <div className="h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-ink active:bg-surface"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="type-label truncate">{label}</p>
            <p className="text-xs text-ink-muted">{caption ?? (progress ? `Passo ${progress.step} de ${progress.total}` : 'Revisão')}</p>
          </div>
        </div>
        <div
          className="h-1 -mx-4 bg-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={progress ? `Passo ${progress.step} de ${progress.total}` : 'Revisão'}
        >
          <div className="h-full bg-brand transition-all duration-300" style={{ width: `${percent}%` }} />
        </div>
      </header>

      <motion.main
        key={stepKey}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="flex-1 px-4 pt-6 pb-40 space-y-5"
      >
        <div className="space-y-1.5 px-1">
          <h1 className="type-title">{title}</h1>
          {subtitle && <p className="text-sm text-ink-muted leading-relaxed">{subtitle}</p>}
        </div>
        {children}
      </motion.main>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-bg/95 backdrop-blur-xl border-t border-line px-6 py-4 pb-safe">
        <div className="max-w-[480px] mx-auto space-y-1.5">
          <Button size="lg" className="w-full" onClick={primary.onClick} disabled={primary.disabled || primary.loading}>
            {primary.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : primary.label}
          </Button>
          <p className="text-xs text-center text-ink-muted min-h-4">{hint}</p>
        </div>
      </div>
    </div>
  );
}
