import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { requestErrorMessage, useCommunityRequestActions, usePendingJoinRequests } from '@/hooks/useCommunityRequests';

/** Gestão: quem pediu para entrar (achou a comunidade pelo cadastro de condomínio) */
export function JoinRequests({ orgId }: { orgId: string }) {
  const { data: requests } = usePendingJoinRequests(orgId, true);
  const { answer } = useCommunityRequestActions();
  if (!requests?.length) return null;

  const respond = async (id: string, accept: boolean, name: string) => {
    try {
      await answer.mutateAsync({ id, accept });
      toast.success(accept ? `${name} agora faz parte da comunidade.` : 'Pedido recusado.');
    } catch (error: unknown) {
      toast.error(requestErrorMessage(error, 'Não foi possível responder.'));
    }
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="type-subtitle">Pedidos para entrar ({requests.length})</h2>
        <p className="text-xs text-ink-muted mt-0.5">Só aceite quem você reconhece como morador ou sócio.</p>
      </div>
      <ul className="bg-surface border border-brand/40 rounded-2xl divide-y divide-line overflow-hidden">
        {requests.map((r) => {
          const name = r.profile?.full_name ?? 'Pessoa';
          return (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar src={r.profile?.avatar_url} name={name} className="w-10 h-10" />
              <span className="text-sm font-medium text-ink flex-1 truncate">{name}</span>
              <Button variant="ghost" size="sm" aria-label={`Recusar ${name}`} onClick={() => respond(r.id, false, name)} disabled={answer.isPending}>
                <X className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={() => respond(r.id, true, name)} disabled={answer.isPending}>
                <Check className="w-4 h-4 mr-1" /> Aceitar
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
