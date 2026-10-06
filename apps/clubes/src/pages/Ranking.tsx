import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, EyeOff, Trophy } from 'lucide-react';
import { useProfile } from '@riff/core/hooks/useProfile';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { Avatar, BrandLines, EmptyState } from '@riff/core/domain';
import { cn } from '@riff/core/lib/utils';
import { useCommunity, todaySP } from '@/hooks/useCommunity';
import { useRanking, type RankingRow } from '@/hooks/useSports';
import { POINTS } from '@/lib/sports';

const monthStart = (d: Date) => format(d, 'yyyy-MM-01');

function PodiumSpot({ row, place, orgId }: { row: RankingRow | undefined; place: 1 | 2 | 3; orgId: string }) {
  if (!row) return <div />;
  const big = place === 1;
  return (
    <Link to={`/c/${orgId}/jogador/${row.profile_id}`} className={cn('flex flex-col items-center gap-1.5 min-w-0', big ? '' : 'pt-6')}>
      <div className="relative">
        <Avatar
          src={row.avatar_url}
          name={row.short_name}
          className={cn(big ? 'w-20 h-20' : 'w-14 h-14', 'ring-4', row.is_me ? 'ring-brand' : 'ring-elevated')}
          fallbackClassName={big ? 'text-2xl' : 'text-base'}
        />
        <span
          className={cn(
            'absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-bg',
            big ? 'bg-brand text-brand-ink' : 'bg-elevated text-ink',
          )}
        >
          {row.rank}º
        </span>
      </div>
      <p className="text-xs font-semibold text-ink truncate max-w-full pt-1">{row.is_me ? 'Você' : row.short_name}</p>
      <p className={cn('text-xs', big ? 'text-brand font-bold' : 'text-ink-muted')}>{row.points} pts</p>
    </Link>
  );
}

// Ranking do mês da comunidade: pódio, lista e como ganhar pontos
export default function Ranking() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { data: community } = useCommunity(orgId);
  const today = parseISO(todaySP());
  const [month, setMonth] = useState(monthStart(today));
  const { data: rows, isLoading } = useRanking(orgId, month);
  const me = rows?.find((r) => r.is_me);
  const top = rows ?? [];
  const monthLabel = format(parseISO(month), 'MMMM', { locale: ptBR });
  const months = [monthStart(today), monthStart(subMonths(today, 1))];

  return (
    <PageContainer withBottomNav={false}>
      <section className="relative overflow-hidden bg-surface border-b border-line pb-6">
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
          <p className="type-label">Ranking · {community?.name ?? ''}</p>
          <h1 className="type-display mt-1 first-letter:uppercase">{monthLabel}</h1>
          <div className="flex gap-2 mt-3" role="tablist">
            {months.map((m, i) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={month === m}
                onClick={() => setMonth(m)}
                className={cn(
                  'h-8 px-3 rounded-full text-xs font-semibold border',
                  month === m ? 'bg-brand text-brand-ink border-brand' : 'bg-elevated border-line text-ink-muted',
                )}
              >
                {i === 0 ? 'Este mês' : 'Mês passado'}
              </button>
            ))}
          </div>

          {orgId && top.length > 0 && (
            <div className="grid grid-cols-3 gap-2 items-end mt-6">
              <PodiumSpot row={top[1]} place={2} orgId={orgId} />
              <PodiumSpot row={top[0]} place={1} orgId={orgId} />
              <PodiumSpot row={top[2]} place={3} orgId={orgId} />
            </div>
          )}
        </div>
      </section>

      <div className="px-6 py-6 space-y-6">
        {profile?.sports_hidden && (
          <Link to="/perfil" className="flex items-center gap-3 bg-surface border border-line rounded-2xl px-4 py-3">
            <EyeOff className="w-5 h-5 text-ink-muted shrink-0" />
            <span className="text-sm text-ink flex-1">Você está no modo reservado e não aparece no ranking. Mude no Perfil.</span>
          </Link>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : top.length === 0 || top.every((r) => r.points === 0) ? (
          <EmptyState
            icon={Trophy}
            title="Ninguém pontuou ainda"
            description="Os pontos aparecem depois dos primeiros jogos do mês. Que tal organizar um?"
            action={{ label: 'Criar evento', onClick: () => navigate('/criar') }}
          />
        ) : (
          <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
            {top.map((r) => (
              <li key={r.profile_id}>
                <Link
                  to={`/c/${orgId}/jogador/${r.profile_id}`}
                  className={cn('flex items-center gap-3 px-4 py-3', r.is_me && 'bg-brand/10')}
                >
                  <span className={cn('w-7 text-center type-subtitle', r.rank <= 3 ? 'text-brand' : 'text-ink-muted')}>{r.rank}</span>
                  <Avatar src={r.avatar_url} name={r.short_name} className="w-9 h-9" fallbackClassName="text-xs" />
                  <span className="text-sm font-semibold text-ink flex-1 truncate">{r.is_me ? 'Você' : r.short_name}</span>
                  <span className="text-sm font-bold text-ink">{r.points}</span>
                  <span className="text-xs text-ink-muted">pts</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {me && me.rank > 3 && (
          <p className="text-center text-sm text-ink">
            Você está em <span className="text-brand font-bold">{me.rank}º</span> com {me.points} pontos.
          </p>
        )}

        <section className="bg-surface border border-line rounded-2xl p-4 space-y-2">
          <h2 className="type-label">Como ganhar pontos</h2>
          {[
            { pts: POINTS.presence, text: 'por jogo em que você esteve' },
            { pts: POINTS.organized, text: 'por evento que você organizou e teve 3 ou mais presentes' },
            { pts: POINTS.kudos, text: 'por elogio recebido (até 3 por jogo)' },
            { pts: POINTS.review, text: 'por avaliar um jogo' },
          ].map((r) => (
            <p key={r.text} className="flex items-center gap-3 text-sm text-ink">
              <span className="w-10 text-right type-subtitle text-brand">+{r.pts}</span>
              <span className="text-ink-muted">{r.text}</span>
            </p>
          ))}
          <p className="text-xs text-ink-muted pt-1">O ranking zera no começo de cada mês. Menores e quem está no modo reservado ficam de fora.</p>
        </section>
      </div>
    </PageContainer>
  );
}
