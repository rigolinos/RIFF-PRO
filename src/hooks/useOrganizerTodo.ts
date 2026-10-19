import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';
import { activityPhase, nowSP } from '@riff/core/lib/activityTime';

const todaySP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

/** Atividades do organizador que já terminaram e esperam a chamada */
export function useCallsToDo() {
  const { profile } = useProfile();
  const [now] = useState(nowSP);
  return useQuery({
    queryKey: ['sessions', 'pro', 'calls-to-do', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, date, start_time, duration_minutes, status')
        .eq('professional_id', profile!.id)
        .eq('product', 'pro')
        .in('status', ['active', 'full'])
        .lte('date', todaySP());
      if (error) throw error;
      return (data ?? []).filter((s) => activityPhase(s, now) === 'ended').length;
    },
    enabled: profile?.role === 'professional',
  });
}

/** Reservas da própria pessoa que ainda esperam o Pix (para o sinal no menu) */
export function useMyPaymentsToMake() {
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['bookings', 'to-pay', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, amount_total, session:sessions!inner(date)')
        .eq('student_id', profile!.id)
        .eq('product', 'pro')
        .eq('payment_status', 'pending')
        .in('status', ['pending', 'confirmed'])
        .gte('session.date', todaySP());
      if (error) throw error;
      return (data ?? []).filter((b) => Number(b.amount_total ?? 0) > 0).length;
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  });
}
