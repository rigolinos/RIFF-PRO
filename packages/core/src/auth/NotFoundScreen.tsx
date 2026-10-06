import { useNavigate } from 'react-router-dom';
import { AuthShell } from '@riff/core/layout/AuthShell';
import { Button } from '@riff/core/ui/button';

/** Página não encontrada (igual nos dois apps). */
export function NotFoundScreen({ product }: { product: string }) {
  const navigate = useNavigate();
  return (
    <AuthShell
      product={product}
      label="Erro 404"
      title="Essa página saiu do jogo"
      subtitle="O endereço não existe ou foi removido. Confira o link ou volte para o início."
    >
      <div className="space-y-2">
        <Button size="lg" className="w-full" onClick={() => navigate('/')}>
          Voltar ao início
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => navigate(-1)}>
          Voltar para a página anterior
        </Button>
      </div>
    </AuthShell>
  );
}
