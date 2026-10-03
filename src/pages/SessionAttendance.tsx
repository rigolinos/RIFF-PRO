import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { supabase } from '@riff/core/supabase/client';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
import { Textarea } from '@riff/core/ui/textarea';
import { Avatar, ConfirmDialog } from '@riff/core/domain';
import { useProSessions } from '@/hooks/useProSessions';
import { useProfile } from '@riff/core/hooks/useProfile';
import { errorMessage } from '@riff/core/lib/utils';

type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Presente' },
  { value: 'late', label: 'Atrasou' },
  { value: 'absent', label: 'Faltou' },
  { value: 'excused', label: 'Justificou' },
];

// Tipos de atividade em que faz sentido registrar placar e posição
const KINDS_WITH_RESULTS = ['match', 'tournament'];

interface Row {
  status: AttendanceStatus;
  paid: boolean;
  note: string;
  position: string;
  score: string;
}

export default function SessionAttendance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { closeSession } = useProSessions();

  // Só as alterações feitas na tela; o resto vem do que já está gravado na reserva
  const [edits, setEdits] = useState<Record<string, Partial<Row>>>({});
  const [notes, setNotes] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [confirmNotHappened, setConfirmNotHappened] = useState(false);

  const { data: session, isLoading, isError } = useQuery({
    queryKey: ['session-attendance', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, title, date, start_time, status, kind,
          bookings(
            id, status, payment_status, attendance_status,
            student:profiles!bookings_student_id_fkey(full_name, avatar_url)
          )
        `)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const bookings = (session?.bookings ?? []).filter((b) => !(b.status ?? '').startsWith('cancelled'));
  const isOpen = session?.status === 'active' || session?.status === 'full';
  const hasStarted = session ? new Date(`${session.date}T${session.start_time}`) <= new Date() : false;
  const canClose = isOpen && hasStarted;
  const withResults = KINDS_WITH_RESULTS.includes(session?.kind ?? '');

  const update = (bookingId: string, patch: Partial<Row>) =>
    setEdits((prev) => ({ ...prev, [bookingId]: { ...prev[bookingId], ...patch } }));

  // Padrão: presente (ou a presença já registrada); pago conforme a reserva
  const rows: Record<string, Row> = Object.fromEntries(
    bookings.map((b) => [
      b.id,
      {
        status: (b.attendance_status as AttendanceStatus | null) ?? 'present',
        paid: b.payment_status === 'paid' || b.payment_status === 'free',
        note: '',
        position: '',
        score: '',
        ...edits[b.id],
      },
    ]),
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['session-attendance', id] });
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };

  // Atividade já encerrada: corrigir a presença grava direto na reserva
  const changeRecordedStatus = async (bookingId: string, status: AttendanceStatus) => {
    update(bookingId, { status });
    const { error } = await supabase.from('bookings').update({ attendance_status: status }).eq('id', bookingId);
    if (error) {
      toast.error(errorMessage(error, 'Não foi possível atualizar a presença.'));
      refresh();
    }
  };

  const handleClose = async () => {
    if (!session) return;
    setIsClosing(true);
    try {
      await closeSession({
        sessionId: session.id,
        notes: notes.trim() || undefined,
        attendance: bookings.map((b) => ({
          booking_id: b.id,
          attended: rows[b.id]?.status === 'present' || rows[b.id]?.status === 'late',
          paid: rows[b.id]?.paid ?? false,
          note: rows[b.id]?.note.trim() || undefined,
        })),
      });

      // O close_session grava presente/ausente; atrasou e justificou entram em seguida
      const followUps: string[] = [];
      for (const status of ['late', 'excused'] as const) {
        const ids = bookings.filter((b) => rows[b.id]?.status === status).map((b) => b.id);
        if (ids.length === 0) continue;
        const { error } = await supabase.from('bookings').update({ attendance_status: status }).in('id', ids);
        if (error) followUps.push('presença');
      }

      if (withResults) {
        const results = bookings
          .filter((b) => rows[b.id]?.position || rows[b.id]?.score)
          .map((b) => ({
            session_id: session.id,
            booking_id: b.id,
            position: rows[b.id].position ? Number(rows[b.id].position) : null,
            score: rows[b.id].score ? Number(rows[b.id].score.replace(',', '.')) : null,
            recorded_by: profile?.id ?? null,
          }));
        if (results.length > 0) {
          const { error } = await supabase.from('activity_results').insert(results);
          if (error) followUps.push('resultados');
        }
      }

      if (followUps.length > 0) {
        toast.warning(`Atividade encerrada, mas não salvamos: ${followUps.join(' e ')}. Tente ajustar em seguida.`);
      } else {
        toast.success('Atividade encerrada!');
      }
      refresh();
      navigate('/my-sessions');
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Erro ao encerrar atividade.'));
    } finally {
      setIsClosing(false);
    }
  };

  const handleNotHappened = async () => {
    if (!session) return;
    setIsClosing(true);
    try {
      await closeSession({ sessionId: session.id, attendance: [], happened: false });
      toast.success('Atividade marcada como não realizada. As reservas foram canceladas.');
      refresh();
      navigate('/my-sessions');
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Erro ao cancelar atividade.'));
    } finally {
      setIsClosing(false);
      setConfirmNotHappened(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  if (isError || !session) {
    return <div className="p-6 text-center text-ink-muted">Atividade não encontrada.</div>;
  }

  const dateLabel = format(parseISO(session.date), "EEEE, d 'de' MMMM", { locale: ptBR });
  const title = canClose ? 'Encerrar atividade' : session.status === 'completed' ? 'Presença' : 'Participantes';

  return (
    <div className={`min-h-screen bg-bg ${canClose ? 'pb-40' : 'pb-12'}`}>
      <div className="bg-surface border-b border-line p-4 pt-safe sticky top-0 z-30 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-ink"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="type-subtitle text-ink truncate max-w-[220px]">{title}</h1>
        <div className="w-10" />
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h2 className="type-subtitle text-ink mb-1">{session.title}</h2>
          <p className="text-sm text-ink-muted first-letter:uppercase">
            {dateLabel} • {session.start_time.substring(0, 5)} • {bookings.length}{' '}
            {bookings.length === 1 ? 'participante' : 'participantes'}
          </p>
        </div>

        {isOpen && !hasStarted && (
          <p className="text-sm text-ink-muted bg-surface border border-line rounded-2xl p-4">
            Você poderá registrar a presença e encerrar a atividade depois do horário de início.
          </p>
        )}
        {session.status === 'cancelled' && (
          <p className="text-sm text-ink-muted bg-surface border border-line rounded-2xl p-4">Esta atividade foi cancelada.</p>
        )}
        {session.status === 'completed' && bookings.length > 0 && (
          <p className="text-sm text-ink-muted">Atividade encerrada. Você ainda pode corrigir a presença de cada pessoa.</p>
        )}

        {bookings.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-line rounded-2xl">
            <User className="w-8 h-8 text-ink-muted mx-auto mb-3" />
            <p className="text-sm text-ink-muted">Nenhum participante inscrito nesta atividade.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const row = rows[b.id];
              const name = b.student?.full_name || 'Participante';
              const editable = canClose || session.status === 'completed';
              return (
                <div key={b.id} className="bg-surface border border-line rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={b.student?.avatar_url} name={name} className="w-11 h-11" />
                    <div className="flex-1 min-w-0">
                      <h3 className="type-subtitle truncate">{name}</h3>
                      <p className="type-label mt-0.5">
                        {b.payment_status === 'free' ? 'Gratuito' : b.payment_status === 'paid' ? 'Pago' : 'Pagamento pendente'}
                      </p>
                    </div>
                  </div>

                  {editable && row && (
                    <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={`Presença de ${name}`}>
                      {STATUS_OPTIONS.map((opt) => {
                        const selected = row.status === opt.value;
                        return (
                          <button
                            key={opt.value}
                            role="radio"
                            aria-checked={selected}
                            onClick={() =>
                              canClose ? update(b.id, { status: opt.value }) : changeRecordedStatus(b.id, opt.value)
                            }
                            className={`h-10 rounded-xl text-xs font-semibold border transition-colors ${
                              selected
                                ? opt.value === 'absent'
                                  ? 'bg-danger/15 border-danger text-danger'
                                  : 'bg-brand text-brand-ink border-brand'
                                : 'bg-elevated border-line text-ink-muted'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {canClose && row && (
                    <>
                      {b.payment_status !== 'free' && b.payment_status !== 'paid' && (
                        <label className="flex items-center justify-between text-sm text-ink bg-elevated rounded-xl px-3 h-10">
                          Recebi o Pix
                          <input
                            type="checkbox"
                            checked={row.paid}
                            onChange={(e) => update(b.id, { paid: e.target.checked })}
                            className="w-4 h-4 accent-[var(--brand)]"
                          />
                        </label>
                      )}
                      {withResults && (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            placeholder="Posição"
                            value={row.position}
                            onChange={(e) => update(b.id, { position: e.target.value })}
                            className="h-10 bg-elevated border-line"
                          />
                          <Input
                            inputMode="decimal"
                            placeholder="Pontos / placar"
                            value={row.score}
                            onChange={(e) => update(b.id, { score: e.target.value })}
                            className="h-10 bg-elevated border-line"
                          />
                        </div>
                      )}
                      <Textarea
                        placeholder={`Nota privada sobre ${name.split(' ')[0]} (opcional)`}
                        className="text-sm bg-elevated border-line h-16 resize-none"
                        value={row.note}
                        onChange={(e) => update(b.id, { note: e.target.value })}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {canClose && (
          <Textarea
            placeholder="Anotações da atividade (privadas, opcional)"
            className="text-sm bg-surface border-line h-20 resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        )}
      </div>

      {canClose && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/90 backdrop-blur-md border-t border-line pb-safe z-40 space-y-2">
          <Button variant="primary" size="lg" className="w-full" onClick={handleClose} disabled={isClosing}>
            {isClosing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar encerramento'}
          </Button>
          <button
            onClick={() => setConfirmNotHappened(true)}
            disabled={isClosing}
            className="w-full text-sm text-ink-muted underline underline-offset-4 py-1"
          >
            A atividade não aconteceu
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmNotHappened}
        onOpenChange={setConfirmNotHappened}
        title="A atividade não aconteceu?"
        description="As reservas serão canceladas e os participantes verão a atividade como cancelada. Reembolsos de quem já pagou são combinados por você."
        cancelLabel="Voltar"
        confirmLabel="Cancelar atividade"
        isDestructive
        isLoading={isClosing}
        onConfirm={handleNotHappened}
      />
    </div>
  );
}
