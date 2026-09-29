import { Home, Search, Plus, ClipboardList, User, LayoutDashboard, BookOpen, DollarSign } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useViewMode } from '@/contexts/ViewModeContext';

export const BottomNav = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { viewMode } = useViewMode();

  const APP_ROUTES = ['/feed', '/explore', '/my-bookings', '/dashboard', '/my-sessions', '/create-session', '/earnings', '/profile'];
  const showNav = APP_ROUTES.some(p => currentPath === p || currentPath.startsWith(p + '/'));

  if (!showNav || !viewMode) return null;

  const isPro = viewMode === 'professional';

  const navItems = isPro
    ? [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Início' },
        { path: '/my-sessions', icon: BookOpen, label: 'Aulas' },
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
      <nav aria-label="Principal" className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-4 pointer-events-none pb-safe">
        <div className="bg-surface/90 backdrop-blur-xl border border-line rounded-full flex items-center justify-around w-full max-w-md h-[68px] px-2 shadow-2 pointer-events-auto relative">
          {navItems.map((item, index) => {
            const isActive = currentPath === item.path || (item.path === '/profile/edit' && currentPath.startsWith('/profile'));

            if (item.isFab) {
              return (
                <div key={item.path} className="relative -top-6 mx-2">
                  <Link
                    to={item.path}
                    className="w-[52px] h-[52px] bg-brand hover:bg-brand/90 text-brand-ink rounded-full flex items-center justify-center shadow-cta active:scale-95 transition-all z-10"
                  >
                    <Plus size={28} strokeWidth={3} />
                  </Link>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center gap-1.5 min-w-[56px] min-h-[44px] group justify-center"
              >
                <div
                  className={cn(
                    'transition-all duration-300',
                    isActive ? 'text-brand -translate-y-0.5' : 'text-ink-muted group-hover:text-ink'
                  )}
                >
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-brand"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                
                <span 
                  className={cn(
                    "text-xs font-bold transition-colors duration-300 tracking-wide",
                    isActive ? "text-brand" : "text-ink-muted"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};
