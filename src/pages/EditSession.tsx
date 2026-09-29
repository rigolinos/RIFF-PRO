import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { SessionForm } from '@/components/forms/SessionForm';
import { useSessions } from '@/hooks/useSessions';

const EditSession = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSessionById, updateSession, isUpdating } = useSessions();
  
  const { data: session, isLoading } = getSessionById(id || '');

  const handleSubmit = async (data: any) => {
    try {
      if (!id) return;
      await updateSession({ id, data });
      toast.success('Aula atualizada com sucesso!');
      navigate('/my-sessions');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar aula.');
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
        Aula não encontrada.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SessionForm initialData={session} onSubmit={handleSubmit} isSubmitting={isUpdating} />
    </div>
  );
};

export default EditSession;
