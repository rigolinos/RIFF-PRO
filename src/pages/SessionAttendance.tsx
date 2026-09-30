import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, User, Check, X } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/domain';

export default function SessionAttendance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isClosing, setIsClosing] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, { present: boolean; paid: boolean; notes: string }>>({});

  const { data: session, isLoading } = useQuery({
    queryKey: ['session-attendance', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          bookings(
            id, status, user_id, 
            student:profiles!bookings_user_id_fkey(full_name, avatar_url)
          )
        `)
        .eq('id', id!)
        .single();
        
      if (error) throw error;
      return data;
    },
  });

  // Initialize attendance state once data is loaded
  useState(() => {
    if (session?.bookings) {
      const initial: Record<string, { present: boolean; paid: boolean; notes: string }> = {};
      session.bookings.forEach((b: Record<string, any>) => {
        if (b.status !== 'cancelled') {
          initial[b.id] = { present: true, paid: true, notes: '' };
        }
      });
      setAttendance(initial);
    }
  });

  if (isLoading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>;
  }

  if (!session) {
    return <div className="p-6 text-center text-ink-muted">Atividade não encontrada.</div>;
  }

  const activeBookings = session.bookings?.filter((b: Record<string, any>) => b.status !== 'cancelled') || [];

  const handleCloseSession = async () => {
    setIsClosing(true);
    try {
      const { error } = await supabase.rpc('close_session', {
        p_session_id: session.id,
        p_happened: true,
        p_attendance: attendance,
        p_notes: '',
      });

      if (error) throw error;

      toast.success('Atividade encerrada com sucesso!');
      navigate(-1);
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Erro ao encerrar atividade.');
    } finally {
      setIsClosing(false);
    }
  };

  const togglePresent = (bookingId: string) => {
    setAttendance(prev => ({
      ...prev,
      [bookingId]: { ...prev[bookingId], present: !prev[bookingId].present }
    }));
  };

  const togglePaid = (bookingId: string) => {
    setAttendance(prev => ({
      ...prev,
      [bookingId]: { ...prev[bookingId], paid: !prev[bookingId].paid }
    }));
  };

  const updateNotes = (bookingId: string, notes: string) => {
    setAttendance(prev => ({
      ...prev,
      [bookingId]: { ...prev[bookingId], notes }
    }));
  };

  return (
    <div className="min-h-screen bg-bg pb-28">
      {/* Header */}
      <div className="bg-surface border-b border-line p-4 pt-safe sticky top-0 z-30 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-ink"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="type-subtitle text-ink truncate max-w-[200px]">Encerrar Atividade</h1>
        <div className="w-10" />
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h2 className="type-subtitle text-ink mb-1">{session.title}</h2>
          <p className="text-sm text-ink-muted">{activeBookings.length} participantes inscritos</p>
        </div>

        {activeBookings.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-line rounded-2xl">
            <User className="w-8 h-8 text-slate mx-auto mb-3" />
            <p className="text-sm text-ink-muted">Nenhum participante inscrito nesta atividade.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeBookings.map((booking: Record<string, any>) => {
              const state = attendance[booking.id] || { present: true, paid: true, notes: '' };
              const studentName = booking.student?.full_name || 'Participante';
              
              return (
                <div key={booking.id} className="bg-surface border border-line rounded-2xl p-4 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={booking.student?.avatar_url} name={studentName} className="w-12 h-12" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-ink truncate">{studentName}</h3>
                      <p className="type-label mt-0.5">
                        Status: {state.paid ? 'Pago' : 'Pendente'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant={state.present ? "primary" : "secondary"} 
                      className={`flex-1 h-10 ${state.present ? 'shadow-[var(--shadow-cta)]' : ''}`}
                      onClick={() => togglePresent(booking.id)}
                    >
                      {state.present ? <Check className="w-4 h-4 mr-1.5" /> : <X className="w-4 h-4 mr-1.5" />}
                      {state.present ? 'Presente' : 'Faltou'}
                    </Button>
                    
                    <Button 
                      variant={state.paid ? "outline" : "secondary"} 
                      className="flex-1 h-10"
                      onClick={() => togglePaid(booking.id)}
                    >
                      {state.paid ? 'Pago' : 'Pendente'}
                    </Button>
                  </div>
                  
                  <div className="mt-1">
                    <Textarea 
                      placeholder={`Nota opcional sobre o desempenho de ${studentName.split(' ')[0]}`}
                      className="text-sm bg-elevated border-line h-16 resize-none"
                      value={state.notes}
                      onChange={(e) => updateNotes(booking.id, e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/90 backdrop-blur-md border-t border-line pb-safe z-40">
        <Button 
          variant="primary" 
          size="lg" 
          className="w-full shadow-[var(--shadow-cta)]"
          onClick={handleCloseSession}
          disabled={isClosing}
        >
          {isClosing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Encerramento'}
        </Button>
      </div>
    </div>
  );
}
