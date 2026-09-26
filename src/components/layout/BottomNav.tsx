import { Home, Search, Plus, ClipboardList, User, LayoutDashboard, BookOpen, DollarSign } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useViewMode } from '@/contexts/ViewModeContext';

export const BottomNav = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { viewMode } = useViewMode();

  // Hide on auth pages and landing
  const hiddenRoutes = ['/', '/login', '/signup', '/onboarding'];
  const isHidden = hiddenRoutes.includes(currentPath) || currentPath.startsWith('/onboarding');

  if (isHidden || !viewMode) return null;

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
      {/* Spacer to prevent content from hiding behind the nav */}
      <div className="h-[80px]" />
      
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-4 pointer-events-none">
        <div className="bg-background/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-around w-full max-w-md h-[68px] px-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-auto relative">
          {navItems.map((item, index) => {
            const isActive = currentPath === item.path || (item.path === '/profile/edit' && currentPath.startsWith('/profile'));

            if (item.isFab) {
              return (
                <div key={item.path} className="relative -top-6 mx-2">
                  <Link
                    to={item.path}
                    className="w-[52px] h-[52px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.35)] active:scale-95 transition-all z-10"
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
                    isActive ? 'text-emerald-400 -translate-y-0.5' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                >
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-emerald-400"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                
                <span 
                  className={cn(
                    "text-[10px] font-medium transition-colors duration-300",
                    isActive ? "text-emerald-400 opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};
