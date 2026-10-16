import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useProfile } from '@riff/core/hooks/useProfile';
import { useViewMode } from '@/contexts/ViewModeContext';

/**
 * Para onde vai quem acabou de entrar: organizador no Painel (se estiver no modo de
 * organizar), participante sem cidade escolhe a cidade, o resto vai para o Início.
 */
const HomeRedirect = () => {
  const { profile, isLoading } = useProfile();
  const { viewMode } = useViewMode();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }
  if (profile?.role === 'professional' && viewMode === 'professional') return <Navigate to="/dashboard" replace />;
  if (profile?.role === 'student' && !profile.city?.trim()) return <Navigate to="/onboarding/student" replace />;
  return <Navigate to="/feed" replace />;
};

export default HomeRedirect;
