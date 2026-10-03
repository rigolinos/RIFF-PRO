import { Link2, Repeat, Wallet } from 'lucide-react';
import type { ProfessionalInsights } from '@/hooks/useProfessionalInsights';

const pct = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)}%` : '–');

// Os números que dizem se o organizador está crescendo pelo próprio público
export function InsightsCard({ insights }: { insights: ProfessionalInsights }) {
  const items = [
    {
      icon: Link2,
      label: 'Pelo seu link',
      value: pct(insights.via_link, insights.tracked_bookings),
      hint:
        insights.tracked_bookings > 0
          ? `${insights.via_link} de ${insights.tracked_bookings} reservas`
          : 'Compartilhe seu link para medir',
    },
    {
      icon: Wallet,
      label: 'Pagas em 30 dias',
      value: String(insights.paid_bookings_30d),
      hint: `${insights.bookings_30d} reservas no período`,
    },
    {
      icon: Repeat,
      label: 'Voltaram',
      value: pct(insights.returning_participants, insights.participants),
      hint: `${insights.returning_participants} de ${insights.participants} participantes`,
    },
  ];

  return (
    <section>
      <h2 className="type-subtitle mb-4">Seu público</h2>
      <div className="grid grid-cols-3 gap-2">
        {items.map(({ icon: Icon, label, value, hint }) => (
          <div key={label} className="bg-surface border border-line rounded-2xl p-3 flex flex-col">
            <div className="flex items-center gap-1.5 text-ink-muted mb-2">
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="type-label truncate">{label}</span>
            </div>
            <span className="type-number text-xl text-ink">{value}</span>
            <span className="text-xs text-ink-muted mt-1 leading-tight">{hint}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
