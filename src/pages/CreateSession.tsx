import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SessionForm } from '@/components/forms/SessionForm';
import { useSessions } from '@/hooks/useSessions';

const CreateSession = () => {
  const navigate = useNavigate();
  const { createSession, isCreating } = useSessions();

  const handleSubmit = async (data: any) => {
    try {
      await createSession(data);
      toast.success('Atividade criada com sucesso! 🎉');
      navigate('/my-sessions');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar atividade.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SessionForm onSubmit={handleSubmit} isSubmitting={isCreating} />
    </div>
  );
};

export default CreateSession;
