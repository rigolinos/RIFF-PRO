import { useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@riff/core/hooks/useProfile';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { Avatar, ConfirmDialog, EmptyState, SpotsMeter, StatusPill } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { useCommunity } from '@/hooks/useCommunity';
import { useRoster, useCloseActivity, type Attendance } from '@/hooks/useManagement';

const OPTIONS: { value: Attendance; label: string }[] = [
  { value: 'present', label: 'Veio' },
  { value: 'late', label: 'Atrasou' },
  { value: 'absent', label: 'Faltou' },
  { value: 'excused', label: 'Justificou' },
];
const RESULT_LABEL: Record<string, string> = { present: 'Veio', late: 'Atrasou', absent: 'Faltou', excused: 'Justificou' };

export default function ActivityRoster() {
  const { orgId, sessionId } = useParams<{ orgId: string; sessionId: string }>();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { data: community, isLoading } = useCommunity(orgId);
  const { data: roster, isLoading: isLoadingRoster } = useRoster(sessionId);
  const close = useCloseActivity(orgId, sessionId);
  const [attendance, setAttendance] = useState<Record<string, Attendance>>({});
  const [confirmNotHappened, setConfirmNotHappened] = useState(false);
  const [now] = useState(() => Date.now());

  if (!isLoading && community === null) return <Navigate to="/inicio" replace />;
  if (!isLoadingRoster && roster === null) return <Navigate to={`/c/${orgId}`} replace />;

  const session = roster?.session;
  const isConductor = !!session && session.professional_id === profile?.id;
  const canClose = !!community && (community.isAdmin || isConductor);
  if (!isLoading && community && session && !canClose) return <Navigate to={`/c/${orgId}`} replace />;

  const open = session && ['active', 'full'].includes(session.status ?? '');
  const started = session ? new Date(`${session.date}T${session.start_time}-03:00`).getTime() <= now : false;
  const pending = (roster?.bookings ?? []).filter((b) => ['pending', 'confirmed'].includes(b.status ?? ''));
  const marked = pending.filter((b) => attendance[b.id]).length;

  const handleClose = async (happened: boolean) => {
    try {
      await close.mutateAsync({ attendance, happened });
      toast.success(happened ? 'Presença registrada e atividade encerrada.' : 'Atividade cancelada e inscrições canceladas.');
      navigate(`/c/${orgId}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível encerrar a atividade.');
    }
  };

  return (
    <PageContainer title={session?.title ?? 'Atividade'} showBack withBottomNav={false}>
      <div className="px-6 py-6 space-y-6 pb-24">
        {session && (
          <div className="space-y-3">
            <p className="type-label first-letter:uppercase">
              {format(parseISO(session.date), "EEEE, d 'de' MMM", { locale: ptBR })} · {session.start_time.substring(0, 5)} ·{' '}
              {session.location_name}
            </p>
            <SpotsMeter current={session.current_participants ?? 0} max={session.max_participants ?? 1} />
          </div>
        )}

        <section className="space-y-3">
          <h2 className="type-subtitle">Inscritos{roster ? ` (${roster.bookings.length})` : ''}</h2>
          {isLoadingRoster ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !roster || roster.bookings.length === 0 ? (
            <EmptyState icon={Users} title="Ninguém inscrito ainda" description="Quem se inscrever aparece aqui." />
          ) : (
            <ul className="space-y-2">
              {roster.bookings.map((b) => {
                const name = b.student?.full_name?.trim() || 'Sem nome';
                const editable = open && started && ['pending', 'confirmed'].includes(b.status ?? '');
                return (
                  <li key={b.id} className="bg-surface border border-line rounded-xl px-4 py-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={b.student?.avatar_url} name={name} className="w-10 h-10" />
                      <p className="text-sm font-medium text-ink truncate flex-1">{name}</p>
                      {b.attendance_status ? (
                        <StatusPill
                          text={RESULT_LABEL[b.attendance_status] ?? b.attendance_status}
                          variant={['present', 'late'].includes(b.attendance_status) ? 'success' : 'neutral'}
                        />
                      ) : null}
                    </div>
                    {editable && (
                      <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={`Presença de ${name}`}>
                        {OPTIONS.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            role="radio"
                            aria-checked={attendance[b.id] === o.value}
                            onClick={() => setAttendance((prev) => ({ ...prev, [b.id]: o.value }))}
                            className={`h-9 rounded-full text-xs font-medium border transition-colors ${
                              attendance[b.id] === o.value ? 'bg-brand text-brand-ink border-brand' : 'bg-elevated border-line text-ink-muted'
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {open && (
          <section className="space-y-3">
            {started && pending.length > 0 && (
              <p className="text-xs text-ink-muted">
                {marked} de {pending.length} marcados. Quem ficar sem marcação conta como falta.
              </p>
            )}
            {started ? (
              <Button size="lg" className="w-full" onClick={() => handleClose(true)} disabled={close.isPending}>
                {close.isPending ? 'Salvando…' : 'Encerrar e salvar presença'}
              </Button>
            ) : (
              <p className="text-xs text-ink-muted">A presença pode ser marcada a partir do horário de início.</p>
            )}
            <Button variant="secondary" className="w-full" onClick={() => setConfirmNotHappened(true)} disabled={close.isPending}>
              {started ? 'A atividade não aconteceu' : 'Cancelar atividade'}
            </Button>
          </section>
        )}
        {session && !open && <StatusPill text={session.status === 'cancelled' ? 'Não aconteceu' : 'Encerrada'} />}
      </div>

      <ConfirmDialog
        open={confirmNotHappened}
        onOpenChange={setConfirmNotHappened}
        title={started ? 'A atividade não aconteceu?' : 'Cancelar atividade?'}
        description="Ela sai da agenda e todas as inscrições são canceladas. Não dá para desfazer."
        confirmLabel="Confirmar"
        isDestructive
        isLoading={close.isPending}
        onConfirm={async () => {
          setConfirmNotHappened(false);
          await handleClose(false);
        }}
      />
    </PageContainer>
  );
}
