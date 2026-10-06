import { cn } from '@riff/core/lib/utils';

/** Bloco numerado de formulário ("1 · O que você vai organizar?"). */
export function FormStep({
  n,
  title,
  hint,
  children,
  className,
}: {
  n: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('bg-surface border border-line rounded-2xl p-4 space-y-3', className)}>
      <div className="flex items-start gap-3">
        <span className="w-6 h-6 rounded-full bg-brand text-brand-ink text-xs font-bold flex items-center justify-center shrink-0">{n}</span>
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {hint && <p className="text-xs text-ink-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
