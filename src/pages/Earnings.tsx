import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Wallet, ArrowDownLeft, Loader2, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { PageContainer } from '@riff/core/layout/PageContainer';
import { HeroHeader } from '@riff/core/layout/HeroHeader';
import { EmptyState, TicketGrid } from '@riff/core/domain';
import { formatBRL } from '@riff/core/lib/money';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';

export default function Earnings() {
  const { profile } = useProfile();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['earnings', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          created_at,
          payment_status,
          session:sessions(title, price_per_slot),
          student:profiles!bookings_student_id_fkey(full_name)
        `)
        .eq('professional_id', profile.id)
        .eq('product', 'pro')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { totalPaid, totalPending } = useMemo(() => {
    let paid = 0;
    let pending = 0;
    
    transactions?.forEach((t: NonNullable<typeof transactions>[number]) => {
      const price = t.session?.price_per_slot || 0;
      if (t.payment_status === 'paid') paid += price;
      if (t.payment_status === 'pending') pending += price;
    });

    return { totalPaid: paid, totalPending: pending };
  }, [transactions]);

  const paidCount = transactions?.filter((t) => t.payment_status === 'paid').length ?? 0;
  const pendingCount = transactions?.filter((t) => t.payment_status === 'pending').length ?? 0;

  return (
    <PageContainer withBottomNav>
      <HeroHeader overlap label="Ganhos" title="Seu financeiro" subtitle="O Pix cai direto na sua conta. Aqui você acompanha quem já pagou." />

      <TicketGrid
        items={[
          { label: 'Recebido', value: <span className="text-success">{formatBRL(totalPaid)}</span>, sub: `${paidCount} pagamento${paidCount === 1 ? '' : 's'}` },
          { label: 'A receber', value: <span className="text-accent">{formatBRL(totalPending)}</span>, sub: `${pendingCount} pendente${pendingCount === 1 ? '' : 's'}` },
        ]}
      />

      <div className="px-4 py-6 flex-1 flex flex-col space-y-3">
        <h2 className="type-label px-2">Extrato</h2>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-brand animate-spin" />
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <EmptyState icon={Wallet} title="Nenhum pagamento ainda" description="Quando alguém reservar uma atividade paga, aparece aqui." />
        ) : (
          <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
            {transactions.map((t: NonNullable<typeof transactions>[number]) => {
              const isPaid = t.payment_status === 'paid';
              const price = t.session?.price_per_slot || 0;
              const name =
                t.student?.full_name
                  ?.split(' ')
                  .map((n) => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase())
                  .join(' ') || 'Participante';
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPaid ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent'}`}
                  >
                    {isPaid ? <ArrowDownLeft className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{name}</p>
                    <p className="text-xs text-ink-muted truncate">{t.session?.title}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold font-display ${isPaid ? 'text-success' : 'text-ink'}`}>{formatBRL(price)}</p>
                    <p className="text-xs text-ink-muted">
                      {isPaid ? 'Pix recebido' : 'Pendente'} · {format(parseISO(t.created_at || ''), 'dd MMM', { locale: ptBR })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
