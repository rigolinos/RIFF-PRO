import { cn } from '@riff/core/lib/utils';

/** Barra de ações fixa no rodapé (reservar, publicar, inscritos…). */
export function StickyActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('fixed bottom-0 left-0 right-0 z-40 bg-bg/95 backdrop-blur-xl border-t border-line px-6 py-4 pb-safe space-y-2', className)}>
      {children}
    </div>
  );
}
