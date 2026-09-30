import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SessionForm } from '@/components/forms/SessionForm';
import { useSessions } from '@/hooks/useSessions';

import type { TablesInsert } from '@/integrations/supabase/types';

const CreateSession = () => {
  const navigate = useNavigate();
  const { createSession, isCreating } = useSessions();

  const handleSubmit = async (data: TablesInsert<'sessions'>) => {
    try {
      await createSession(data);
      toast.success('Atividade criada com sucesso! 🎉');
      navigate('/my-sessions');
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Erro ao criar atividade.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SessionForm onSubmit={handleSubmit} isSubmitting={isCreating} />
    </div>
  );
};

export default CreateSession;
