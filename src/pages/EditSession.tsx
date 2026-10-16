import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { errorMessage } from '@riff/core/lib/utils';
import { EmptyState } from '@riff/core/domain';
import { SessionWizard } from '@/components/forms/SessionWizard';
import { useSessions, useSessionById } from '@/hooks/useSessions';
import { valuesFromSession } from '@/lib/sessionForm';

// Editar atividade: o mesmo assistente da criação, aberto na revisão
const EditSession = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateSession, isUpdating } = useSessions();
  const { data: session, isLoading } = useSessionById(id || '');

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-[100dvh] bg-bg flex items-center justify-center p-6">
        <EmptyState title="Atividade não encontrada" description="Ela pode ter sido cancelada." action={{ label: 'Minhas atividades', onClick: () => navigate('/my-sessions') }} />
      </div>
    );
  }

  const participants = session.current_participants ?? 0;

  return (
    <SessionWizard
      mode="edit"
      initial={valuesFromSession(session)}
      startAt="review"
      hasParticipants={participants > 0}
      hadSportOther={!!session.sport_other}
      original={{ title: session.title, date: session.date, start_time: session.start_time, location_name: session.location_name, participants }}
      isOrganizer
      onSubmit={async (data) => {
        try {
          await updateSession({ id: session.id, data });
          toast.success('Alterações salvas.');
          navigate('/my-sessions');
        } catch (error: unknown) {
          toast.error(errorMessage(error, 'Não foi possível salvar as alterações.'));
        }
      }}
      onExit={() => navigate(-1)}
      isSubmitting={isUpdating}
    />
  );
};

export default EditSession;
