import { toast } from 'sonner';
import { Avatar } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { useBlockProfile, useMyBlocks } from '@riff/core/hooks/useModeration';
import { moderationError } from '@riff/core/lib/moderation';

/** Pessoas que eu bloqueei, com "Desbloquear". Só aparece quando há alguém na lista. */
export function BlockedPeople() {
  const { data: blocks } = useMyBlocks();
  const blockProfile = useBlockProfile();
  if (!blocks?.length) return null;

  const unblock = (profileId: string, name: string) =>
    blockProfile.mutate(
      { profileId, block: false },
      {
        onSuccess: () => toast.success(`${name} foi desbloqueado.`),
        onError: (error) => toast.error(moderationError(error, 'Não foi possível desbloquear. Tente de novo.')),
      },
    );

  return (
    <section className="space-y-2">
      <h2 className="type-label px-2">Pessoas bloqueadas</h2>
      <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
        {blocks.map((b) => (
          <li key={b.profile_id} className="flex items-center gap-3 px-4 py-2.5">
            <Avatar src={b.avatar_url} name={b.name} className="w-9 h-9" fallbackClassName="text-xs" />
            <span className="flex-1 min-w-0 text-sm text-ink truncate">{b.name}</span>
            <Button variant="secondary" size="sm" disabled={blockProfile.isPending} onClick={() => unblock(b.profile_id, b.name)}>
              Desbloquear
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
