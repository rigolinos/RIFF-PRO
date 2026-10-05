import { Link } from 'react-router-dom';
import { Building2, ChevronRight, KeyRound, Settings } from 'lucide-react';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { EmptyState, StatusPill } from '@riff/core/domain';
import { useMyCommunities } from '@/hooks/useActivities';
import { JoinWithCode } from '@/components/JoinWithCode';
import { ROLE_LABEL } from '@/lib/roles';

// Condomínios e clubes de que a pessoa faz parte
export default function Communities() {
  const { data: communities, isLoading, isError } = useMyCommunities();

  return (
    <PageContainer title="Suas comunidades">
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
                    <p className="text-xs text-ink-muted mt-0.5">{c.kind === 'condo' ? 'Condomínio' : 'Clube'}</p>
                  </div>
                  <StatusPill text={ROLE_LABEL[c.role] ?? c.role} variant={c.isAdmin ? 'info' : 'neutral'} />
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
      </div>
    </PageContainer>
  );
}
