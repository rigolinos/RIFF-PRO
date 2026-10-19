import { useNavigate } from 'react-router-dom';

/**
 * Voltar que nunca prende a pessoa. Volta para a tela anterior quando ela veio de dentro do
 * app; quando abriu direto (link do WhatsApp, app aberto numa tela, depois de um
 * redirecionamento), não existe tela anterior do app e "voltar" ia para fora ou não fazia
 * nada. Nesse caso vai para `fallback` (a tela de entrada leva quem está logado ao Início).
 */
export function useGoBack(fallback = '/') {
  const navigate = useNavigate();
  return () => {
    // o React Router guarda a posição no histórico em history.state.idx (0 = primeira tela do app)
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };
}
