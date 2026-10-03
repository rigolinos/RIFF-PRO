import { useQuery } from '@tanstack/react-query';
import { Building2, KeyRound, LogOut, ChevronRight } from 'lucide-react';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { EmptyState } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';

const ROLE_LABEL: Record<string, string> = {
  owner: 'Gestor',
  admin: 'Gestor',
  instructor: 'Instrutor',
  member: 'Membro',
};

// Condomínios e clubes de que a pessoa faz parte (organization_members, Lote 3)
function useMyCommunities(profileId: string | undefined) {
  return useQuery({
    queryKey: ['communities', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('role, organization:organizations(id, name, kind)')
        .eq('profile_id', profileId!)
        .eq('status', 'active');
      if (error) throw error;
      return (data ?? []).filter((m) => m.organization && ['condo', 'club'].includes(m.organization.kind));
    },
    enabled: !!profileId,
  });
}

export default function Communities() {
  const { profile } = useProfile();
  const { data: communities, isLoading, isError } = useMyCommunities(profile?.id);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const firstName = profile?.full_name?.split(' ')[0];

  return (
    <PageContainer
      title="Suas comunidades"
      withBottomNav={false}
      rightAction={
        <button onClick={handleLogout} aria-label="Sair" className="w-10 h-10 rounded-full flex items-center justify-center text-ink-muted hover:text-ink">
          <LogOut className="w-5 h-5" />
        </button>
      }
    >
      <div className="px-6 py-6 space-y-6">
        {firstName && <p className="text-ink-muted">Olá, {firstName}!</p>}

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
            description="Peça o código de convite ao seu condomínio ou clube. Em breve você poderá usá-lo aqui."
          />
        ) : (
          <ul className="space-y-3">
            {communities.map((m) => (
              <li key={m.organization!.id}>
                <div className="bg-surface border border-line rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-elevated border border-line flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="type-subtitle truncate">{m.organization!.name}</h2>
                    <p className="type-label mt-0.5">
                      {m.organization!.kind === 'condo' ? 'Condomínio' : 'Clube'} · {ROLE_LABEL[m.role] ?? m.role}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-ink-muted" />
                </div>
              </li>
            ))}
          </ul>
        )}

        <Button variant="secondary" className="w-full" disabled>
          <KeyRound className="w-4 h-4 mr-2" /> Entrar com código de convite (em breve)
        </Button>
      </div>
    </PageContainer>
  );
}
