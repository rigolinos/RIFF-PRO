import { Link } from 'react-router-dom';
import { ChevronRight, Trophy } from 'lucide-react';
import { Avatar } from '@riff/core/domain';
import { cn } from '@riff/core/lib/utils';
import { useRanking } from '@/hooks/useSports';

/** Top 3 do mês e a posição de quem está vendo, com atalho para o ranking completo. */
export function RankingPreview({ orgId }: { orgId: string }) {
  const { data: rows } = useRanking(orgId);
  const scored = (rows ?? []).filter((r) => r.points > 0);
  const me = rows?.find((r) => r.is_me);

  return (
    <Link to={`/c/${orgId}/ranking`} className="block bg-surface border border-line rounded-2xl p-4 space-y-3 active:scale-[.99] transition-transform">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 type-subtitle">
          <Trophy className="w-5 h-5 text-brand" /> Ranking do mês
        </span>
        <span className="text-xs font-semibold text-brand flex items-center">
          Ver tudo <ChevronRight className="w-4 h-4" />
        </span>
      </div>
      {scored.length === 0 ? (
        <p className="text-sm text-ink-muted">Ninguém pontuou ainda neste mês. O primeiro jogo já vale 10 pontos.</p>
      ) : (
        <ul className="space-y-2">
          {scored.slice(0, 3).map((r) => (
            <li key={r.profile_id} className="flex items-center gap-3">
              <span className={cn('w-5 text-center text-sm font-bold', r.rank === 1 ? 'text-brand' : 'text-ink-muted')}>{r.rank}</span>
              <Avatar src={r.avatar_url} name={r.short_name} className="w-8 h-8" fallbackClassName="text-xs" />
              <span className="text-sm text-ink flex-1 truncate">{r.is_me ? 'Você' : r.short_name}</span>
              <span className="text-sm font-bold text-ink">{r.points}</span>
            </li>
          ))}
        </ul>
      )}
      {me && me.rank > 3 && me.points > 0 && (
        <p className="text-xs text-ink-muted border-t border-line pt-2">
          Você está em <span className="text-brand font-bold">{me.rank}º</span> com {me.points} pontos.
        </p>
      )}
    </Link>
  );
}
