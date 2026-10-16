import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Wallet } from 'lucide-react';
import { Avatar } from '@riff/core/domain';
import { formatBRL } from '@riff/core/lib/money';
import { errorMessage } from '@riff/core/lib/utils';
import { useConfirmPayment, usePendingPayments } from '@/hooks/usePayments';

/**
 * "Pagamentos para confirmar": quem reservou e disse que pagou espera o organizador
 * confirmar o Pix. Confirmar garante a vaga da pessoa. `limit` mostra só os primeiros
 * (no Painel) com o link para Ganhos.
 */
export function PendingPayments({ limit, hideWhenEmpty = true }: { limit?: number; hideWhenEmpty?: boolean }) {
  const { data: pending, isLoading } = usePendingPayments();
  const confirm = useConfirmPayment();
  const [busy, setBusy] = useState<string | null>(null);

  if (isLoading) return null;
  if (!pending?.length) {
    return hideWhenEmpty ? null : (
      <p className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
        <CheckCircle2 className="w-4 h-4 text-success" /> Nenhum pagamento esperando confirmação.
      </p>
    );
  }

  const shown = limit ? pending.slice(0, limit) : pending;

  const markPaid = async (bookingId: string, name: string) => {
    setBusy(bookingId);
    try {
      await confirm.mutateAsync({ bookingId, paid: true });
      toast.success(`Pagamento de ${name} confirmado. A vaga está garantida.`, {
        action: { label: 'Desfazer', onClick: () => void confirm.mutateAsync({ bookingId, paid: false }) },
      });
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Não foi possível confirmar o pagamento.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between px-2">
        <h2 className="type-subtitle flex items-center gap-2">
          <Wallet className="w-4 h-4 text-accent" /> Pagamentos para confirmar
        </h2>
        <span className="text-xs font-semibold text-accent">{pending.length}</span>
      </div>
      <p className="text-xs text-ink-muted px-2">Viu o Pix na sua conta? Confirme para garantir a vaga da pessoa.</p>
      <ul className="bg-surface border border-accent/40 rounded-2xl divide-y divide-line overflow-hidden">
        {shown.map((b) => {
          const name = b.student?.full_name?.split(' ')[0] || 'Participante';
          return (
            <li key={b.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar src={b.student?.avatar_url} name={b.student?.full_name} className="w-10 h-10" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">
                  {name} · <span className="text-accent">{formatBRL(Number(b.amount_total ?? 0))}</span>
                </p>
                <p className="text-xs text-ink-muted truncate first-letter:uppercase">
                  {b.session.title} · {format(parseISO(b.session.date), "EEE, d 'de' MMM", { locale: ptBR })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void markPaid(b.id, name)}
                disabled={busy === b.id}
                className="h-10 px-3 rounded-xl bg-success/15 text-success text-xs font-semibold flex items-center gap-1.5 shrink-0 active:scale-[.98]"
              >
                {busy === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Recebi
              </button>
            </li>
          );
        })}
      </ul>
      {limit && pending.length > limit && (
        <Link to="/earnings" className="block text-center text-sm font-semibold text-brand py-1">
          Ver todos ({pending.length})
        </Link>
      )}
    </section>
  );
}
