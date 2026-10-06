import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@riff/core/lib/utils';

export interface BottomNavItem {
  path: string;
  icon: LucideIcon;
  label: string;
  /** Botão de destaque no centro (ação principal, ex.: Criar) */
  isFab?: boolean;
  /** Item ativo; por padrão, caminho igual ou começando por `path/` */
  isActive?: (pathname: string) => boolean;
}

/**
 * Barra de navegação inferior (visual do Riff). Cada app decide quais itens
 * mostrar e em quais telas; aqui fica só o desenho.
 */
export function BottomNavBar({ items, pathname }: { items: BottomNavItem[]; pathname: string }) {
  return (
    <>
      <div className="h-[80px]" aria-hidden="true" />
      <nav aria-label="Principal" className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-4 pointer-events-none pb-safe">
        <div className="bg-surface/90 backdrop-blur-xl border border-line rounded-full flex items-center justify-around w-full max-w-md p-2 shadow-[var(--shadow-2)] pointer-events-auto relative">
          {items.map((item) => {
            const active = item.isActive
              ? item.isActive(pathname)
              : pathname === item.path || pathname.startsWith(item.path + '/');

            if (item.isFab) {
              return (
                <div key={item.path} className="relative mx-1 shrink-0">
                  <Link
                    to={item.path}
                    aria-label={item.label}
                    className="w-14 h-14 bg-brand hover:brightness-105 text-brand-ink rounded-full flex flex-col items-center justify-center shadow-[var(--shadow-cta)] active:scale-95 transition-all"
                  >
                    <item.icon size={24} strokeWidth={2.5} />
                    <span className="text-xs font-bold mt-0.5">{item.label}</span>
                  </Link>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 min-w-[56px] py-1.5 px-1 rounded-full transition-all flex-1 mx-0.5',
                  active ? 'bg-brand-soft text-bg font-semibold' : 'text-ink-muted hover:text-ink hover:bg-elevated',
                )}
              >
                <item.icon size={22} strokeWidth={active ? 2 : 1.75} />
                <span className="text-xs whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
