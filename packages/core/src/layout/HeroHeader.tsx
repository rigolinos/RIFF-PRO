import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@riff/core/lib/utils';
import { BrandLines } from '@riff/core/domain/BrandLines';

interface HeroHeaderProps {
  /** Rótulo pequeno acima do título (ex.: "Novo evento", "Ranking") */
  label?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Botão de voltar no canto (navigate(-1) ou onBack) */
  showBack?: boolean;
  onBack?: () => void;
  /** Ação no canto direito do topo (ex.: compartilhar, avatar) */
  topRight?: React.ReactNode;
  /** Conteúdo do topo à esquerda no lugar do voltar (ex.: seletor de comunidade) */
  topLeft?: React.ReactNode;
  /** Foto de capa: aparece sob o véu escuro, no lugar das linhas da marca */
  imageUrl?: string | null;
  /** Conteúdo extra abaixo do subtítulo (selos, resumo, pódio…) */
  children?: React.ReactNode;
  /** Espaço embaixo para um cartão sobreposto (TicketGrid usa -mt-10) */
  overlap?: boolean;
  className?: string;
  contentClassName?: string;
}

/**
 * Cabeçalho de destaque do Riff: linhas paralelas do "R" e brilho dourado (ou a
 * foto sob véu escuro), topo com voltar/ações, rótulo, título e subtítulo.
 * Usado no Riff Pro e no Riff Clubes.
 */
export function HeroHeader({
  label,
  title,
  subtitle,
  showBack,
  onBack,
  topRight,
  topLeft,
  imageUrl,
  children,
  overlap = false,
  className,
  contentClassName,
}: HeroHeaderProps) {
  const navigate = useNavigate();
  const hasTop = showBack || topLeft || topRight;

  return (
    <section className={cn('relative overflow-hidden bg-surface border-b border-line', overlap ? 'pb-14' : 'pb-6', className)}>
      {imageUrl ? (
        <>
          <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-bg/70" aria-hidden="true" />
        </>
      ) : (
        <>
          <BrandLines className="absolute inset-y-0 right-0 h-full w-3/4" />
          <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
        </>
      )}
      <div className={cn('relative px-6 pt-safe', !hasTop && 'pt-8', contentClassName)}>
        {hasTop && (
          <div className="h-16 flex items-center justify-between gap-3">
            {topLeft ??
              (showBack ? (
                <button
                  type="button"
                  onClick={() => (onBack ? onBack() : navigate(-1))}
                  aria-label="Voltar"
                  className="w-10 h-10 -ml-2 rounded-full bg-bg/50 backdrop-blur-sm flex items-center justify-center text-ink active:scale-95"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : (
                <span />
              ))}
            {topRight}
          </div>
        )}
        {label && <p className="type-label">{label}</p>}
        {title && <h1 className="type-display mt-1">{title}</h1>}
        {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}

/** Botão redondo para o topo do cabeçalho (compartilhar, editar…) */
export function HeroIconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-10 h-10 rounded-full bg-bg/50 backdrop-blur-sm flex items-center justify-center text-ink active:scale-95"
    >
      {children}
    </button>
  );
}
