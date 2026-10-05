import { useLocation } from 'react-router-dom';
import { CalendarCheck, Home, Plus, User, Users } from 'lucide-react';
import { BottomNavBar, type BottomNavItem } from '@riff/core/layout/BottomNavBar';

// Telas principais do Riff Clubes: o menu aparece só nelas (formulários e
// detalhes abrem em tela cheia, com "voltar").
const ITEMS: BottomNavItem[] = [
  { path: '/inicio', icon: Home, label: 'Início' },
  {
    path: '/comunidades',
    icon: Users,
    label: 'Comunidades',
    isActive: (p) => p.startsWith('/comunidades') || /^\/c\/[^/]+$/.test(p),
  },
  { path: '/criar', icon: Plus, label: 'Criar', isFab: true },
  { path: '/agenda', icon: CalendarCheck, label: 'Agenda' },
  { path: '/perfil', icon: User, label: 'Perfil', isActive: (p) => p.startsWith('/perfil') || p === '/dependentes' },
];

const WITH_NAV = [/^\/inicio$/, /^\/comunidades$/, /^\/c\/[^/]+$/, /^\/agenda$/, /^\/perfil$/, /^\/dependentes$/];

export function AppNav() {
  const { pathname } = useLocation();
  if (!WITH_NAV.some((r) => r.test(pathname))) return null;
  return <BottomNavBar items={ITEMS} pathname={pathname} />;
}
