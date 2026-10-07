import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@riff/core/hooks/useAuth';
import { useLegalAcceptance } from '@riff/core/hooks/useLegalAcceptance';

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
  </div>
);

// Exige sessão e, salvo em skipLegal, o aceite da versão vigente dos documentos legais.
export function ProtectedRoute({ children, skipLegal = false }: { children: React.ReactNode; skipLegal?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const legal = useLegalAcceptance();

  if (loading || (user && !skipLegal && legal.isLoading)) {
    return <Spinner />;
  }

  if (!user) {
    // depois de entrar, volta para onde a pessoa queria ir (ex.: link de cadastro de comunidade)
    const back = location.pathname + location.search;
    return <Navigate to={back && back !== '/' ? `/login?redirect=${encodeURIComponent(back)}` : '/login'} replace />;
  }

  // Se a consulta falhar, não trava o app inteiro; a tela de aceite volta a ser cobrada no próximo acesso.
  if (!skipLegal && !legal.isError && legal.missing.length > 0) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/aceite?next=${next}`} replace />;
  }

  return <>{children}</>;
}
