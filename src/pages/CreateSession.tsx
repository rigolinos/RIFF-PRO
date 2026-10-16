import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@riff/core/hooks/useProfile';
import { ConfirmDialog } from '@riff/core/domain';
import { errorMessage } from '@riff/core/lib/utils';
import { SessionWizard } from '@/components/forms/SessionWizard';
import { PublishedScreen } from '@/components/forms/PublishedScreen';
import { useSessionById, useSessions } from '@/hooks/useSessions';
import { organizerErrorMessage, useOrganizerMissing } from '@/hooks/useOrganizer';
import { clearDraft, readDraft, valuesFromSession } from '@/lib/sessionForm';

type Published = { id: string; title: string; date: string; start_time: string; location_name: string | null };

// Depois do cadastro de organizador, volta para cá e abre a revisão
const AFTER_DOOR = '/create-session?publicar=1';

const Spinner = () => (
  <div className="min-h-[100dvh] bg-bg flex items-center justify-center">
    <Loader2 className="w-8 h-8 text-brand animate-spin" />
  </div>
);

/**
 * Criar atividade. Quem ainda não é organizador monta a atividade inteira e, ao publicar,
 * faz o cadastro de organizador; a atividade fica guardada e volta na revisão.
 * `?repetir=<id>` abre a mesma atividade uma semana depois, já na revisão.
 */
const CreateSession = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const repeatId = params.get('repetir') ?? '';
  const { profile } = useProfile();
  const { createSession, isCreating } = useSessions();
  const { data: missing, isLoading: loadingMissing } = useOrganizerMissing();
  const { data: template, isLoading: loadingTemplate } = useSessionById(repeatId);
  const [askDoor, setAskDoor] = useState(false);
  const [published, setPublished] = useState<Published | null>(null);
  // muda a chave para recomeçar o assistente do zero ("Criar outra")
  const [round, setRound] = useState(0);
  const [afterDoorDraft, setAfterDoorDraft] = useState(() => (params.get('publicar') === '1' ? readDraft() : null));

  const needsDoor = !!missing && missing.length > 0;

  const handleSubmit = async (data: Parameters<typeof createSession>[0]) => {
    if (needsDoor) {
      setAskDoor(true);
      return;
    }
    try {
      const created = await createSession(data);
      clearDraft();
      setPublished({ id: created.id, title: created.title, date: created.date, start_time: created.start_time, location_name: created.location_name });
    } catch (error: unknown) {
      toast.error(organizerErrorMessage(error, errorMessage(error, 'Não foi possível publicar a atividade.')));
    }
  };

  if (published) {
    return (
      <PublishedScreen
        session={published}
        onView={() => navigate(`/session/${published.id}`)}
        onDone={() => navigate('/my-sessions')}
        onCreateAnother={() => {
          setPublished(null);
          setAfterDoorDraft(null);
          setParams({}, { replace: true });
          setRound((r) => r + 1);
        }}
      />
    );
  }

  if (loadingMissing || (repeatId && loadingTemplate)) return <Spinner />;

  const repeating = !!repeatId && !!template;
  const initial = repeating ? valuesFromSession(template, { nextWeek: true }) : afterDoorDraft?.values;

  return (
    <>
      <SessionWizard
        key={`${round}-${repeating ? repeatId : afterDoorDraft ? 'door' : 'new'}`}
        mode="create"
        initial={initial}
        startAt={repeating || afterDoorDraft ? 'review' : 'kind'}
        banner={
          repeating
            ? 'Mesma atividade, uma semana depois. Confira e publique.'
            : afterDoorDraft
              ? 'Cadastro de organizador pronto. Confira e publique.'
              : undefined
        }
        offerDraft={!repeating && !afterDoorDraft}
        isOrganizer={profile?.role === 'professional' && !needsDoor}
        onSubmit={handleSubmit}
        onExit={() => navigate(-1)}
        isSubmitting={isCreating}
      />
      <ConfirmDialog
        open={askDoor}
        onOpenChange={setAskDoor}
        title="Falta só o seu cadastro de organizador"
        description="Para publicar, precisamos saber quem é você e onde você recebe: nome completo, CPF ou CNPJ, celular e chave Pix. Leva uns 2 minutos, e a sua atividade fica guardada."
        cancelLabel="Agora não"
        confirmLabel="Fazer meu cadastro"
        onConfirm={() => navigate(`/onboarding/pro?next=${encodeURIComponent(AFTER_DOOR)}`)}
      />
    </>
  );
};

export default CreateSession;
