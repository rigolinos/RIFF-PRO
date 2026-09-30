import { SessionWithJoins } from '@/types/session';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { SessionForm } from '@/components/forms/SessionForm';
import { useSessions, useSessionById } from '@/hooks/useSessions';

import type { TablesInsert } from '@/integrations/supabase/types';

const EditSession = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateSession, isUpdating } = useSessions();
  
  const { data: session, isLoading } = useSessionById(id || '');

  const handleSubmit = async (data: TablesInsert<'sessions'>) => {
    try {
      if (!id) return;
      await updateSession({ id, data });
      toast.success('Atividade atualizada com sucesso!');
      navigate('/my-sessions');
    } catch (error: unknown) {
      toast.error((error instanceof Error ? error.message : 'Erro desconhecido') || 'Erro ao atualizar atividade.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Atividade não encontrada.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SessionForm initialData={session as unknown as SessionWithJoins} onSubmit={handleSubmit} isSubmitting={isUpdating} />
    </div>
  );
};

export default EditSession;
