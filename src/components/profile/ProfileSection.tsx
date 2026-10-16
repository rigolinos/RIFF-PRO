import { ChevronDown } from 'lucide-react';

/**
 * Seção do Perfil que abre e fecha, com uma linha dizendo o que tem dentro.
 * Usa <details>: os campos continuam no formulário mesmo fechados.
 */
export function ProfileSection({
  id,
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  id?: string;
  title: string;
  summary: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  // aberta quando o link aponta para ela (ex.: /profile/edit#pix)
  const open = defaultOpen || (!!id && typeof window !== 'undefined' && window.location.hash === `#${id}`);
  return (
    <details id={id} open={open} className="group bg-surface border border-line rounded-2xl scroll-mt-24">
      <summary className="flex items-center gap-3 px-4 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{title}</span>
          <span className="block text-xs text-ink-muted mt-0.5 truncate">{summary}</span>
        </span>
        <ChevronDown className="w-5 h-5 text-ink-muted shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4 space-y-4 border-t border-line pt-4">{children}</div>
    </details>
  );
}
