import { Home, Search, Plus, ClipboardList, User, LayoutDashboard, BookOpen, DollarSign } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { BottomNavBar, type BottomNavItem } from '@riff/core/layout/BottomNavBar';
import { useViewMode } from '@/contexts/ViewModeContext';

const APP_ROUTES = ['/feed', '/explore', '/my-bookings', '/dashboard', '/my-sessions', '/create-session', '/earnings', '/profile'];

const isProfile = (p: string) => p.startsWith('/profile');

// Itens de cada modo: organizador (painel, atividades, criar, ganhos, perfil) e participante
const PRO_ITEMS: BottomNavItem[] = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Início' },
  { path: '/my-sessions', icon: BookOpen, label: 'Atividades' },
  { path: '/create-session', icon: Plus, label: 'Criar', isFab: true },
  { path: '/earnings', icon: DollarSign, label: 'Ganhos' },
  { path: '/profile/edit', icon: User, label: 'Perfil', isActive: isProfile },
];

const STUDENT_ITEMS: BottomNavItem[] = [
  { path: '/feed', icon: Home, label: 'Início' },
  { path: '/explore', icon: Search, label: 'Explorar' },
  { path: '/my-bookings', icon: ClipboardList, label: 'Reservas' },
  { path: '/profile/edit', icon: User, label: 'Perfil', isActive: isProfile },
];

export const BottomNav = () => {
  const { pathname } = useLocation();
  const { viewMode } = useViewMode();

  // Detalhe e formulários abrem em tela cheia, sem menu
  if (pathname.startsWith('/session/') || pathname.startsWith('/create-session') || pathname.startsWith('/edit-session')) return null;
  const showNav = APP_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (!showNav || !viewMode) return null;

  return <BottomNavBar items={viewMode === 'professional' ? PRO_ITEMS : STUDENT_ITEMS} pathname={pathname} />;
};
