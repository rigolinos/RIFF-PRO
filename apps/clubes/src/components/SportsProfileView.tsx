import { Check, MapPin } from 'lucide-react';
import { cn } from '@riff/core/lib/utils';
import type { PlayerProfile } from '@/hooks/useSports';
import { ACHIEVEMENTS, KUDOS } from '@/lib/sports';
import { SportIcon } from '@riff/core/domain/SportIcon';

/** Números em formato de ingresso: jogos, frequência e eventos organizados. */
export function StatsTicket({ p }: { p: PlayerProfile }) {
  const stats = [
    { value: String(p.games), label: p.games === 1 ? 'jogo' : 'jogos' },
    { value: p.attendance == null ? '—' : `${p.attendance}%`, label: 'frequência' },
    { value: String(p.organized), label: p.organized === 1 ? 'organizou' : 'organizados' },
  ];
  return (
    <div className="relative z-10 -mt-10 mx-4 grid grid-cols-3 divide-x divide-line bg-elevated border border-line rounded-2xl shadow-[var(--shadow-2)]">
      {stats.map((s) => (
        <div key={s.label} className="p-3 text-center">
          <p className="type-title leading-tight">{s.value}</p>
          <p className="text-xs text-ink-muted">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function Block({ title, children, empty }: { title: string; children: React.ReactNode; empty?: string | false }) {
  return (
    <section className="space-y-2">
      <h2 className="type-label">{title}</h2>
      {empty ? <p className="text-sm text-ink-muted bg-surface border border-line rounded-2xl px-4 py-3">{empty}</p> : children}
    </section>
  );
}

/** Esportes, elogios, conquistas e locais (o mesmo para o próprio perfil e o de um vizinho). */
export function SportsProfileView({ p, self }: { p: PlayerProfile; self: boolean }) {
  const kudosTotal = Object.values(p.kudos).reduce((n, v) => n + (v ?? 0), 0);
  const achievements = [...p.achievements].sort((a, b) => Number(b.current >= b.target) - Number(a.current >= a.target));

  return (
    <div className="space-y-6">
      <Block title="Conquistas">
        <ul className="grid grid-cols-1 gap-2">
          {achievements.map((a) => {
            const meta = ACHIEVEMENTS[a.key];
            if (!meta) return null;
            const done = a.current >= a.target;
            const pct = Math.round((a.current / a.target) * 100);
            return (
              <li
                key={a.key}
                className={cn('flex items-center gap-3 rounded-2xl border px-4 py-3', done ? 'bg-brand/10 border-brand/50' : 'bg-surface border-line')}
              >
                <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', done ? 'bg-brand text-brand-ink' : 'bg-elevated text-ink-muted')}>
                  {done ? <Check className="w-5 h-5" /> : <meta.icon className="w-5 h-5" strokeWidth={1.75} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink truncate">{meta.title}</p>
                    <span className="text-xs text-ink-muted shrink-0">
                      {a.current} de {a.target}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted truncate">
                    {done ? 'Conquistado' : `${a.target} ${meta.hint(a.detail)}`}
                  </p>
                  {!done && (
                    <div className="mt-1.5 h-1 rounded-full bg-elevated overflow-hidden" aria-hidden="true">
                      <div className="h-1 rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Block>

      <Block
        title={`Elogios recebidos${kudosTotal ? ` · ${kudosTotal}` : ''}`}
        empty={!kudosTotal && (self ? 'Ainda sem elogios. Depois de cada jogo, quem jogou com você pode elogiar.' : 'Ainda sem elogios.')}
      >
        <div className="grid grid-cols-5 gap-2">
          {KUDOS.map((k) => {
            const n = p.kudos[k.tag] ?? 0;
            return (
              <div
                key={k.tag}
                className={cn('rounded-2xl border py-3 text-center', n ? 'bg-surface border-brand/40' : 'bg-surface border-line opacity-60')}
              >
                <k.icon className={cn('w-5 h-5 mx-auto', n ? 'text-brand' : 'text-ink-muted')} strokeWidth={1.75} />
                <p className="type-subtitle leading-tight mt-1">{n}</p>
                <p className="text-xs text-ink-muted leading-tight px-0.5">{k.label}</p>
              </div>
            );
          })}
        </div>
      </Block>

      <Block title="Esportes" empty={!p.sports.length && 'Os esportes aparecem aqui depois do primeiro jogo.'}>
        <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
          {p.sports.map((s) => (
            <li key={s.name} className="flex items-center gap-3 px-4 py-3">
              <SportIcon slug={s.slug} className="w-5 h-5 text-brand shrink-0" />
              <span className="text-sm text-ink flex-1">{s.name}</span>
              <span className="text-xs text-ink-muted">
                {s.n} jogo{s.n > 1 ? 's' : ''}
              </span>
            </li>
          ))}
        </ul>
      </Block>

      {p.venues.length > 0 && (
        <Block title="Onde mais joga">
          <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
            {p.venues.map((v) => (
              <li key={v.name ?? 'local'} className="flex items-center gap-3 px-4 py-3">
                <MapPin className="w-5 h-5 text-ink-muted shrink-0" />
                <span className="text-sm text-ink flex-1 truncate">{v.name ?? 'Local'}</span>
                <span className="text-xs text-ink-muted">{v.n}×</span>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </div>
  );
}
