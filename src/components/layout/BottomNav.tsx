import { Home, Search, Plus, ClipboardList, User, LayoutDashboard, BookOpen, DollarSign } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@riff/core/lib/utils';
import { useViewMode } from '@/contexts/ViewModeContext';

export const BottomNav = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { viewMode } = useViewMode();

  const APP_ROUTES = ['/feed', '/explore', '/my-bookings', '/dashboard', '/my-sessions', '/create-session', '/earnings', '/profile'];
  
  // Exclude /session/:id
  if (currentPath.startsWith('/session/') || currentPath.startsWith('/create-session') || currentPath.startsWith('/edit-session')) return null;
  
  const showNav = APP_ROUTES.some(p => currentPath === p || currentPath.startsWith(p + '/'));

  if (!showNav || !viewMode) return null;

  const isPro = viewMode === 'professional';

  const navItems = isPro
    ? [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Início' },
        { path: '/my-sessions', icon: BookOpen, label: 'Atividades' },
        { path: '/create-session', icon: Plus, label: 'Criar', isFab: true },
        { path: '/earnings', icon: DollarSign, label: 'Ganhos' },
        { path: '/profile/edit', icon: User, label: 'Perfil' },
      ]
    : [
        { path: '/feed', icon: Home, label: 'Início' },
        { path: '/explore', icon: Search, label: 'Explorar' },
        { path: '/my-bookings', icon: ClipboardList, label: 'Reservas' },
        { path: '/profile/edit', icon: User, label: 'Perfil' },
      ];

  return (
    <>
      <div className="h-[80px]" /> {/* Spacer */}
      <nav aria-label="Principal" className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-4 pointer-events-none pb-safe">
        <div className="bg-surface/90 backdrop-blur-xl border border-line rounded-full flex items-center justify-around w-full max-w-md p-2 shadow-[var(--shadow-2)] pointer-events-auto relative">
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path === '/profile/edit' && currentPath.startsWith('/profile'));

            if (item.isFab) {
              return (
                <div key={item.path} className="relative mx-1 shrink-0">
                  <Link
                    to={item.path}
                    className="w-14 h-14 bg-brand hover:brightness-105 text-brand-ink rounded-full flex flex-col items-center justify-center shadow-[var(--shadow-cta)] active:scale-95 transition-all"
                  >
                    <Plus size={24} strokeWidth={2.5} />
                    <span className="text-xs font-bold mt-0.5">{item.label}</span>
                  </Link>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 min-w-[64px] py-1.5 px-2 rounded-full transition-all flex-1 mx-1",
                  isActive ? "bg-brand-soft text-bg font-semibold" : "text-ink-muted hover:text-ink hover:bg-elevated"
                )}
              >
                <item.icon size={22} strokeWidth={isActive ? 2 : 1.75} />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};
