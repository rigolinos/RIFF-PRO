import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, EyeOff, Trophy } from 'lucide-react';
import { useProfile } from '@riff/core/hooks/useProfile';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { Avatar, BrandLines, EmptyState } from '@riff/core/domain';
import { usePlayerProfile } from '@/hooks/useSports';
import { useCommunity } from '@/hooks/useCommunity';
import { SportsProfileView, StatsTicket } from '@/components/SportsProfileView';

// Perfil esportista de um vizinho, só com os números desta comunidade
export default function PlayerProfile() {
  const { orgId, profileId } = useParams<{ orgId: string; profileId: string }>();
  const navigate = useNavigate();
  const { profile: me } = useProfile();
  const { data: community } = useCommunity(orgId);
  const { data: p, isLoading } = usePlayerProfile(profileId, orgId);
  const self = !!me && me.id === profileId;

  return (
    <PageContainer withBottomNav={false}>
      <section className="relative overflow-hidden bg-surface border-b border-line pb-14">
        <BrandLines className="absolute inset-y-0 right-0 h-full w-3/4" />
        <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
        <div className="relative px-6 pt-safe">
          <div className="h-16 flex items-center">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="w-10 h-10 -ml-2 rounded-full bg-bg/50 backdrop-blur-sm flex items-center justify-center text-ink active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          {p && (
            <div className="flex flex-col items-center text-center gap-2">
              <Avatar src={p.avatar_url} name={p.name} className="w-24 h-24 ring-4 ring-bg" fallbackClassName="text-3xl" />
              <h1 className="type-title">{self ? 'Você' : p.name}</h1>
              <p className="text-xs text-ink-muted">
                {community?.name ?? ''}
                {p.member_since ? ` · desde ${format(parseISO(p.member_since), "MMMM 'de' yyyy", { locale: ptBR })}` : ''}
              </p>
              {p.month_rank ? (
                <span className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-brand text-brand-ink text-xs font-bold">
                  <Trophy className="w-3.5 h-3.5" /> {p.month_rank}º no ranking do mês · {p.month_points} pts
                </span>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {p && <StatsTicket p={p} />}

      <div className="px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !p ? (
          <EmptyState
            icon={EyeOff}
            title="Perfil reservado"
            description="Esta pessoa prefere não mostrar o perfil esportista, ou ela não faz parte desta comunidade."
          />
        ) : (
          <SportsProfileView p={p} self={self} />
        )}
      </div>
    </PageContainer>
  );
}
