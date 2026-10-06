import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@riff/core/lib/utils';
import { Logo } from '@riff/core/ui/logo';
import { BrandLines } from '@riff/core/domain/BrandLines';

interface AuthShellProps {
  /** Nome do app ("Riff Pro", "Riff Clubes"): a segunda palavra vai em dourado */
  product: string;
  label?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Botão de voltar no topo */
  onBack?: () => void;
  /** Passo atual de um fluxo curto (onboarding) */
  progress?: { step: number; total: number };
  children: React.ReactNode;
  /** Linha de rodapé (ex.: "Já tem conta? Entrar") */
  footer?: React.ReactNode;
  className?: string;
}

/** Nome do app com a marca: ícone do arqueiro + "Riff" + produto em dourado */
export function ProductMark({ product }: { product: string }) {
  const [first, ...rest] = product.split(' ');
  return (
    <span className="flex items-center gap-2">
      <Logo variant="icon" size="sm" />
      <span className="font-display text-base font-bold text-ink">
        {first} {rest.length > 0 && <span className="text-brand">{rest.join(' ')}</span>}
      </span>
    </span>
  );
}

/**
 * Moldura das telas de entrada (login, cadastro, senha, aceite, onboarding):
 * cabeçalho com as linhas da marca, nome do app, título e o conteúdo embaixo.
 * Usada no Riff Pro e no Riff Clubes.
 */
export function AuthShell({ product, label, title, subtitle, onBack, progress, children, footer, className }: AuthShellProps) {
  return (
    <div className={cn('min-h-[100dvh] bg-bg text-ink flex flex-col w-full max-w-[480px] mx-auto overflow-x-hidden', className)}>
      <section className="relative overflow-hidden bg-surface border-b border-line pb-8">
        <BrandLines className="absolute inset-y-0 right-0 h-full w-3/4" />
        <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
        <div className="relative px-6 pt-safe">
          <div className="h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Voltar"
                  className="w-10 h-10 -ml-2 rounded-full bg-bg/50 backdrop-blur-sm flex items-center justify-center text-ink active:scale-95"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <ProductMark product={product} />
            </div>
            {progress && (
              <div className="flex gap-1.5" aria-label={`Passo ${progress.step} de ${progress.total}`}>
                {Array.from({ length: progress.total }, (_, i) => (
                  <span key={i} className={cn('h-1.5 rounded-full transition-all', i < progress.step ? 'w-6 bg-brand' : 'w-3 bg-line')} />
                ))}
              </div>
            )}
          </div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="pt-4">
            {label && <p className="type-label">{label}</p>}
            <h1 className="type-display mt-1">{title}</h1>
            {subtitle && <p className="text-sm text-ink-muted mt-2 leading-relaxed">{subtitle}</p>}
          </motion.div>
        </div>
      </section>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="flex-1 flex flex-col px-6 py-6"
      >
        {children}
      </motion.div>

      {footer && <div className="px-6 pb-8 text-center text-sm text-ink-muted">{footer}</div>}
    </div>
  );
}
