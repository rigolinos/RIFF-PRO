import { Link } from 'react-router-dom';
import { useProfile } from '@riff/core/hooks/useProfile';
import { cn } from '@riff/core/lib/utils';

/** Agenda de quem também organiza: "Vou" (reservas) e "Organizo" (atividades). Participante só vê a sua lista. */
export function AgendaTabs({ active }: { active: 'vou' | 'organizo' }) {
  const { profile } = useProfile();
  if (profile?.role !== 'professional') return null;
  const tabs = [
    { key: 'vou', label: 'Vou', to: '/my-bookings' },
    { key: 'organizo', label: 'Organizo', to: '/my-sessions' },
  ] as const;
  return (
    <div className="mt-4 grid grid-cols-2 gap-1 bg-bg/60 backdrop-blur-sm border border-line rounded-full p-1" role="tablist" aria-label="Agenda">
      {tabs.map((t) => (
        <Link
          key={t.key}
          to={t.to}
          replace
          role="tab"
          aria-selected={active === t.key}
          className={cn(
            'h-9 rounded-full text-sm flex items-center justify-center transition-colors',
            active === t.key ? 'bg-brand text-brand-ink font-semibold' : 'text-ink-muted font-medium',
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
