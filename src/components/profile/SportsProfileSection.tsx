import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, EyeOff, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, SportIcon } from '@riff/core/domain';
import { AchievementList } from '@riff/core/domain/AchievementList';
import { Switch } from '@riff/core/ui/switch';
import { useProfile } from '@riff/core/hooks/useProfile';
import { errorMessage } from '@riff/core/lib/utils';
import type { ProSportsProfile } from '@/hooks/useSportsProfile';

function Block({ title, children, empty }: { title: string; children?: React.ReactNode; empty?: string | false }) {
  return (
    <section className="space-y-2">
      <h2 className="type-label px-2">{title}</h2>
      {empty ? <p className="text-sm text-ink-muted bg-surface border border-line rounded-2xl px-4 py-3">{empty}</p> : children}
    </section>
  );
}

/** Perfil esportista pessoal (só a própria pessoa vê): conquistas, esportes, organizadores e locais, e o modo reservado. */
export function SportsProfileSection({ p }: { p: ProSportsProfile }) {
  const { profile, updateProfile, isUpdating } = useProfile();
  const hidden = !!profile?.sports_hidden;

  // Vindo da avaliação ("Ver meu perfil esportista"): rola até aqui
  useEffect(() => {
    if (window.location.hash === '#esportista') {
      document.getElementById('esportista')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const toggleHidden = async (value: boolean) => {
    try {
      await updateProfile({ sports_hidden: value });
      toast.success(value ? 'Modo reservado ligado. Em "Quem vai", você aparece como "Participante".' : 'Modo reservado desligado. Sua foto volta a aparecer em "Quem vai".');
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Não foi possível mudar o modo reservado.'));
    }
  };

  return (
    <div id="esportista" className="space-y-6 scroll-mt-24">
      <Block title="Conquistas">
        <AchievementList items={p.achievements} />
      </Block>

      <Block title="Esportes" empty={!p.sports.length && 'Seus esportes aparecem aqui depois da primeira atividade.'}>
        <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
          {p.sports.map((s) => (
            <li key={s.name} className="flex items-center gap-3 px-4 py-3">
              <SportIcon slug={s.slug} className="w-5 h-5 text-brand shrink-0" />
              <span className="text-sm text-ink flex-1">{s.name}</span>
              <span className="text-xs text-ink-muted">
                {s.n} atividade{s.n > 1 ? 's' : ''}
              </span>
            </li>
          ))}
        </ul>
      </Block>

      {p.organizers.length > 0 && (
        <Block title="Com quem você mais treina">
          <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
            {p.organizers.map((o) => (
              <li key={o.id}>
                <Link to={o.public_slug ? `/pro/${o.public_slug}` : '#'} className="flex items-center gap-3 px-4 py-3 active:bg-elevated">
                  <Avatar src={o.avatar_url} name={o.name} className="w-9 h-9" fallbackClassName="text-xs" />
                  <span className="text-sm text-ink flex-1 truncate">{o.name}</span>
                  <span className="text-xs text-ink-muted">{o.n}×</span>
                  <ChevronRight className="w-4 h-4 text-ink-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {p.venues.length > 0 && (
        <Block title="Onde mais treina">
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

      <section className="space-y-2">
        <h2 className="type-label px-2">Privacidade</h2>
        <label className="flex items-center gap-3 bg-surface border border-line rounded-2xl px-4 py-3.5">
          <EyeOff className="w-5 h-5 text-ink-muted shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-sm text-ink">Modo reservado</span>
            <span className="block text-xs text-ink-muted">
              Em "Quem vai", você aparece como "Participante", sem foto. Vale também no Riff Clubes. Só você vê este perfil esportista.
            </span>
          </span>
          <Switch checked={hidden} onCheckedChange={toggleHidden} disabled={isUpdating} />
        </label>
      </section>
    </div>
  );
}
