import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Wallet, ArrowDownLeft, ArrowUpRight, Loader2, DollarSign, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { PageContainer } from '@/components/layout/PageContainer';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';

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
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { totalPaid, totalPending } = useMemo(() => {
    let paid = 0;
    let pending = 0;
    
    transactions?.forEach((t: any) => {
      const price = t.session?.price_per_slot || 0;
      if (t.payment_status === 'paid') paid += price;
      if (t.payment_status === 'pending') pending += price;
    });

    return { totalPaid: paid, totalPending: pending };
  }, [transactions]);

  if (isLoading) {
    return (
      <PageContainer title="Meus Ganhos" withBottomNav>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Financeiro" withBottomNav>
      <div className="px-6 py-6 flex-1 flex flex-col space-y-6">
        
        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4 relative overflow-hidden bg-brand/10 border-brand/20">
            <div className="absolute top-0 right-0 p-3 opacity-20">
              <DollarSign className="w-12 h-12 text-brand" />
            </div>
            <div className="flex items-center gap-1.5 text-brand mb-2">
              <ArrowDownLeft className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Saldo Recebido</span>
            </div>
            <div className="flex items-baseline gap-1 relative z-10">
              <span className="text-sm font-semibold text-brand">R$</span>
              <span className="text-2xl font-bold text-brand">
                {totalPaid.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          <div className="glass-card p-4 relative overflow-hidden border-accent/20 bg-accent/15">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Clock className="w-12 h-12 text-accent" />
            </div>
            <div className="flex items-center gap-1.5 text-accent mb-2">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">A Receber</span>
            </div>
            <div className="flex items-baseline gap-1 relative z-10">
              <span className="text-sm font-semibold text-accent">R$</span>
              <span className="text-2xl font-bold text-accent">
                {totalPending.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Extrato Recente
          </h3>
          
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-white/[0.02] rounded-2xl border border-white/5">
              <Wallet className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhuma transação encontrada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((t: any) => {
                const isPaid = t.payment_status === 'paid';
                const price = t.session?.price_per_slot || 0;
                
                return (
                  <div key={t.id} className="glass-card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPaid ? 'bg-brand/10 text-brand' : 'bg-accent/15 text-accent'}`}>
                        {isPaid ? <ArrowDownLeft className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {t.student?.full_name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-xs uppercase font-bold px-1.5 py-0.5 rounded ${isPaid ? 'bg-brand/20 text-brand' : 'bg-accent/15 text-accent'}`}>
                            {isPaid ? 'Pix Recebido' : 'Pendente'}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {t.session?.title}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0 ml-3">
                      <p className={`font-bold text-sm ${isPaid ? 'text-brand' : 'text-foreground'}`}>
                        + R$ {price.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(t.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
