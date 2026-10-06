import { cn } from '@riff/core/lib/utils';

/** Classe de botão-chip (seleção rápida em formulários e filtros). */
export const chipClass = (active: boolean) =>
  cn(
    'h-9 px-3 rounded-full text-sm font-medium border transition-colors',
    active ? 'bg-brand text-brand-ink border-brand' : 'bg-surface border-line text-ink-muted',
  );
