import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage } from '@riff/core/lib/utils';
import { SessionForm } from '@/components/forms/SessionForm';
import { useSessions } from '@/hooks/useSessions';
import { organizerErrorMessage, useOrganizerMissing } from '@/hooks/useOrganizer';

import type { TablesInsert } from '@riff/core/supabase/types';

const CreateSession = () => {
  const navigate = useNavigate();
  const { createSession, isCreating } = useSessions();
  const { data: missing, isLoading } = useOrganizerMissing();

  const handleSubmit = async (data: TablesInsert<'sessions'>) => {
    try {
      await createSession(data);
      // Publicada: o rascunho não deve reaparecer na próxima atividade
      try {
        localStorage.removeItem('riff-session-draft');
      } catch {
        // armazenamento indisponível (aba anônima etc.): nada a limpar
      }
      toast.success('Atividade criada com sucesso! 🎉');
      navigate('/my-sessions');
    } catch (error: unknown) {
      toast.error(organizerErrorMessage(error, errorMessage(error, 'Erro ao criar atividade.')));
    }
  };

  // Publicar no Pro exige o cadastro de organizador completo (porta de organizador)
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }
  if (missing && missing.length > 0) return <Navigate to="/onboarding/pro?next=/create-session" replace />;

  return (
    <div className="min-h-screen bg-background">
      <SessionForm onSubmit={handleSubmit} isSubmitting={isCreating} />
    </div>
  );
};

export default CreateSession;
