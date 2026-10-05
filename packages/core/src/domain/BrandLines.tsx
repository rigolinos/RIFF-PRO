import { cn } from '@riff/core/lib/utils';

/**
 * Motivo da marca: as linhas paralelas do "R" do Riff, inclinadas.
 * Decorativo (aria-hidden). A cor vem do texto (`text-brand` por padrão), então
 * segue os tokens do design system em qualquer app.
 */
export function BrandLines({ className, count = 6 }: { className?: string; count?: number }) {
  return (
    <svg
      viewBox="0 0 240 200"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMaxYMid slice"
      className={cn('text-brand pointer-events-none', className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <line
          key={i}
          x1={110 + i * 26}
          y1={-10}
          x2={40 + i * 26}
          y2={210}
          stroke="currentColor"
          strokeWidth={9}
          strokeLinecap="round"
          opacity={0.08 + (i / count) * 0.22}
        />
      ))}
    </svg>
  );
}
