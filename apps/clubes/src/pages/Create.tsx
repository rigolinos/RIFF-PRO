import { Link, Navigate } from 'react-router-dom';
import { Building2, ChevronRight } from 'lucide-react';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { useMyCommunities } from '@/hooks/useActivities';
import { FirstAccess } from '@/components/FirstAccess';

// Botão "Criar" do menu: escolhe a comunidade (ou vai direto, se só houver uma)
export default function Create() {
  const { data: communities, isLoading } = useMyCommunities();

  if (!isLoading && communities?.length === 1) return <Navigate to={`/c/${communities[0].id}/nova`} replace />;

  return (
    <PageContainer title="Criar evento" showBack>
      <div className="px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !communities || communities.length === 0 ? (
          <>
            <p className="type-subtitle">Primeiro, entre no grupo do seu condomínio ou clube</p>
            <FirstAccess />
          </>
        ) : (
          <>
            <p className="text-ink-muted">Em qual grupo vai ser?</p>
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
