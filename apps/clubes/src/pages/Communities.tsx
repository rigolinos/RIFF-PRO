import { Link } from 'react-router-dom';
import { Building2, ChevronRight, KeyRound, Plus, Settings } from 'lucide-react';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { EmptyState } from '@riff/core/domain';
import { useMyCommunities } from '@/hooks/useActivities';
import { JoinWithCode } from '@/components/JoinWithCode';
import { ROLE_LABEL } from '@/lib/roles';
import { StatusPill } from '@riff/core/domain';
import { requestErrorMessage, useCommunityRequestActions, useMyCommunityRequests } from '@/hooks/useCommunityRequests';
import { toast } from 'sonner';

// Condomínios e clubes de que a pessoa faz parte
export default function Communities() {
  const { data: communities, isLoading, isError } = useMyCommunities();
  const { data: requests } = useMyCommunityRequests();
  const { cancel } = useCommunityRequestActions();
  const openRequests = (requests ?? []).filter((r) => r.status === 'pending' || r.status === 'rejected');

  const cancelRequest = async (id: string) => {
    try {
      await cancel.mutateAsync(id);
      toast.success('Pedido cancelado.');
    } catch (error: unknown) {
      toast.error(requestErrorMessage(error, 'Não foi possível cancelar.'));
    }
  };

  return (
    <PageContainer title="Clubes e condomínios">
      <div className="px-6 py-6 space-y-6">
        <p className="text-sm text-ink-muted">
          Cada condomínio ou clube tem a própria agenda. Só quem é da comunidade vê e participa.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <EmptyState title="Não foi possível carregar suas comunidades" description="Tente novamente em instantes." />
        ) : !communities || communities.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="Você ainda não faz parte de nenhuma comunidade"
            description="Peça o código de convite ao seu condomínio ou clube e use o botão abaixo."
          />
        ) : (
          <ul className="space-y-3">
            {communities.map((c) => (
              <li key={c.id} className="bg-surface border border-line rounded-2xl">
                <Link to={`/c/${c.id}`} className="flex items-center gap-3 p-4">
                  <div className="w-11 h-11 rounded-xl bg-elevated border border-line flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="type-subtitle truncate">{c.name}</h2>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {c.kind === 'condo' ? 'Condomínio' : 'Clube'} · {ROLE_LABEL[c.role] ?? c.role}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-ink-muted shrink-0" />
                </Link>
                {c.isAdmin && (
                  <Link
                    to={`/c/${c.id}/gestao`}
                    className="flex items-center gap-2 border-t border-line px-4 py-3 text-sm text-brand"
                  >
                    <Settings className="w-4 h-4" /> Gestão: membros, convites e presença
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}

        <JoinWithCode />

        {openRequests.length > 0 && (
          <section className="space-y-2">
            <h2 className="type-label">Seus pedidos</h2>
            <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
              {openRequests.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <Building2 className="w-5 h-5 text-ink-muted shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink truncate">{r.name}</span>
                    <span className="block text-xs text-ink-muted">{r.city ?? (r.kind === 'condo' ? 'Condomínio' : 'Clube')}</span>
                  </span>
                  {r.status === 'pending' ? (
                    <>
                      <StatusPill text="Em análise" variant="alert" />
                      <button type="button" onClick={() => cancelRequest(r.id)} className="text-xs text-ink-muted underline underline-offset-4">
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <StatusPill text="Não aprovado" variant="danger" />
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link
          to="/cadastrar-comunidade"
          className="flex items-center gap-3 rounded-2xl border border-dashed border-brand/60 px-4 py-4 active:bg-surface"
        >
          <span className="w-11 h-11 rounded-xl bg-brand/15 text-brand flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Cadastrar meu condomínio ou clube</span>
            <span className="block text-xs text-ink-muted">Seu lugar ainda não está no Riff? Peça aqui.</span>
          </span>
          <ChevronRight className="w-5 h-5 text-ink-muted shrink-0" />
        </Link>
      </div>
    </PageContainer>
  );
}
