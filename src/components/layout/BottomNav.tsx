import { Home, Search, Plus, CalendarCheck, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { BottomNavBar, type BottomNavItem } from '@riff/core/layout/BottomNavBar';
import { useProfile } from '@riff/core/hooks/useProfile';

const APP_ROUTES = ['/feed', '/explore', '/my-bookings', '/dashboard', '/my-sessions', '/earnings', '/profile'];

const startsWithAny = (p: string, list: string[]) => list.some((x) => p === x || p.startsWith(x + '/'));

// Um menu só para todos: quem organiza tem o resumo no Início e a aba "Organizo" na Agenda
export const BottomNav = () => {
  const { pathname } = useLocation();
  const { profile } = useProfile();

  // Detalhe e formulários abrem em tela cheia, sem menu
  if (pathname.startsWith('/session/') || pathname.startsWith('/create-session') || pathname.startsWith('/edit-session')) return null;
  if (!startsWithAny(pathname, APP_ROUTES)) return null;

  const items: BottomNavItem[] = [
    { path: '/feed', icon: Home, label: 'Início', isActive: (p) => startsWithAny(p, ['/feed', '/dashboard', '/earnings']) },
    { path: '/explore', icon: Search, label: 'Explorar' },
    { path: '/create-session', icon: Plus, label: 'Criar', isFab: true },
    {
      path: profile?.role === 'professional' ? '/my-sessions' : '/my-bookings',
      icon: CalendarCheck,
      label: 'Agenda',
      isActive: (p) => startsWithAny(p, ['/my-bookings', '/my-sessions']),
    },
    { path: '/profile/edit', icon: User, label: 'Perfil', isActive: (p) => p.startsWith('/profile') },
  ];
  return <BottomNavBar items={items} pathname={pathname} />;
};
