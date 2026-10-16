import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useProfile } from '@riff/core/hooks/useProfile';
import { clearInviteCode, readInviteCode } from '@/lib/invite';
import { useJoinCommunity } from '@/hooks/useJoinCommunity';

/** Quem chegou por um link de convite entra sozinho no grupo, assim que a conta está pronta */
export function usePendingInvite() {
  const { profile } = useProfile();
  const join = useJoinCommunity();
  const started = useRef(false);

  useEffect(() => {
    const code = readInviteCode();
    if (!profile || !code || started.current) return;
    started.current = true;
    void join.mutateAsync(code).then((result) => {
      clearInviteCode();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }, [profile, join]);

  return join.isPending;
}
