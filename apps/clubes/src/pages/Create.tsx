import { Link, Navigate } from 'react-router-dom';
import { Building2, ChevronRight, KeyRound } from 'lucide-react';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { EmptyState } from '@riff/core/domain';
import { useMyCommunities } from '@/hooks/useActivities';
import { JoinWithCode } from '@/components/JoinWithCode';

// Botão "Criar" do menu: escolhe a comunidade (ou vai direto, se só houver uma)
export default function Create() {
  const { data: communities, isLoading } = useMyCommunities();

  if (!isLoading && communities?.length === 1) return <Navigate to={`/c/${communities[0].id}/nova`} replace />;

  return (
    <PageContainer title="Criar atividade" showBack>
      <div className="px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !communities || communities.length === 0 ? (
          <>
            <EmptyState
              icon={KeyRound}
              title="Primeiro, entre numa comunidade"
              description="As atividades acontecem no seu condomínio ou clube. Use o código de convite que o gestor enviou."
            />
            <JoinWithCode defaultOpen />
          </>
        ) : (
          <>
            <p className="text-ink-muted">Em qual comunidade vai ser?</p>
            <ul className="space-y-3">
              {communities.map((c) => (
                <li key={c.id}>
                  <Link to={`/c/${c.id}/nova`} className="flex items-center gap-3 bg-surface border border-line rounded-2xl p-4">
                    <Building2 className="w-5 h-5 text-brand shrink-0" />
                    <span className="type-subtitle flex-1 truncate">{c.name}</span>
                    <ChevronRight className="w-5 h-5 text-ink-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </PageContainer>
  );
}
