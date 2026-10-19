import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight, ClipboardCheck, LayoutDashboard, Wallet } from 'lucide-react';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { usePendingPayments } from '@/hooks/usePayments';
import { useCallsToDo } from '@/hooks/useOrganizerTodo';

/** No Início de quem organiza: o que tem hoje, o que espera ação e o atalho para o Painel */
export function OrganizerSummary() {
  const { data } = useDashboardMetrics();
  const { data: pending } = usePendingPayments();
  const { data: calls } = useCallsToDo();

  const today = data?.todaySessions ?? [];
  const next = data?.nextSession;
  const line = today.length
    ? `Hoje você organiza ${today.length} atividade${today.length > 1 ? 's' : ''}.`
    : next
      ? `Próxima: ${next.title}, ${format(parseISO(next.date), "EEE, d 'de' MMM", { locale: ptBR })} às ${next.start_time.slice(0, 5)}.`
      : 'Nenhuma atividade marcada. Toque em Criar para publicar a próxima.';

  const todo = [
    pending?.length ? { to: '/earnings', icon: Wallet, text: `${pending.length} pagamento${pending.length > 1 ? 's' : ''} para confirmar` } : null,
    calls ? { to: '/my-sessions?aba=chamada', icon: ClipboardCheck, text: `${calls} chamada${calls > 1 ? 's' : ''} para fazer` } : null,
  ].filter(Boolean) as { to: string; icon: typeof Wallet; text: string }[];

  return (
    <section className="mx-4 bg-surface border border-brand/40 rounded-2xl overflow-hidden">
      <Link to="/dashboard" className="flex items-center gap-3 p-4 active:bg-elevated">
        <span className="w-10 h-10 rounded-xl bg-brand/15 text-brand flex items-center justify-center shrink-0">
          <LayoutDashboard className="w-5 h-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block type-label text-brand">Você organiza · Painel</span>
          <span className="block text-sm text-ink mt-0.5">{line}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-ink-muted shrink-0" />
      </Link>
      {todo.map((t) => (
        <Link key={t.to} to={t.to} className="flex items-center gap-2 border-t border-line px-4 py-3 text-sm font-semibold text-ink active:bg-elevated">
          <t.icon className="w-4 h-4 text-accent shrink-0" />
          <span className="flex-1">{t.text}</span>
          <ChevronRight className="w-4 h-4 text-ink-muted" />
        </Link>
      ))}
    </section>
  );
}
