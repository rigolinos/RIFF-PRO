import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useProfile } from '@riff/core/hooks/useProfile';

/**
 * Para onde vai quem acabou de entrar: participante sem cidade escolhe a cidade; o resto
 * vai para o Início (quem organiza vê ali o resumo e o atalho para o Painel).
 */
const HomeRedirect = () => {
  const { profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }
  if (profile?.role === 'student' && !profile.city?.trim()) return <Navigate to="/onboarding/student" replace />;
  return <Navigate to="/feed" replace />;
};

export default HomeRedirect;
