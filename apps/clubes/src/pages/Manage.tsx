import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreVertical, Ticket, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@riff/core/hooks/useProfile';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { Avatar, ConfirmDialog, EmptyState, StatusPill } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@riff/core/ui/dropdown-menu';
import { useCommunity } from '@/hooks/useCommunity';
import { useMembers, useInvites, useManageActions, type MemberAction } from '@/hooks/useManagement';
import { InviteMembers } from '@/components/InviteMembers';
import { formatInviteCode } from '@/lib/invite';

const ROLE_LABEL: Record<string, string> = { owner: 'Responsável', admin: 'Gestor', instructor: 'Instrutor', member: 'Membro' };
const ROLE_ACTIONS: { action: MemberAction; role: string; label: string }[] = [
  { action: 'make_member', role: 'member', label: 'Tornar membro' },
  { action: 'make_instructor', role: 'instructor', label: 'Tornar instrutor' },
  { action: 'make_admin', role: 'admin', label: 'Tornar gestor' },
];

const Spinner = () => (
  <div className="flex justify-center py-8">
    <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function Manage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { profile } = useProfile();
  const { data: community, isLoading } = useCommunity(orgId);
  const { data: members, isLoading: isLoadingMembers } = useMembers(orgId);
  const { data: invites } = useInvites(orgId);
  const { manageMember, revokeInvite } = useManageActions(orgId);
  const [toRemove, setToRemove] = useState<{ id: string; name: string } | null>(null);
  const [revokedCodes, setRevokedCodes] = useState<string[]>([]);

  if (!isLoading && community === null) return <Navigate to="/inicio" replace />;
  if (!isLoading && community && !community.isAdmin) return <Navigate to={`/c/${orgId}`} replace />;

  const runAction = async (profileId: string, action: MemberAction, name: string) => {
    try {
      await manageMember.mutateAsync({ profileId, action });
      toast.success(
        action === 'remove'
          ? `${name} saiu da comunidade. As inscrições futuras foram canceladas.`
          : `${name} agora é ${ROLE_LABEL[ROLE_ACTIONS.find((a) => a.action === action)!.role].toLowerCase()}.`,
      );
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o membro.');
    }
  };

  const handleRevoke = async (inviteId: string, code: string) => {
    try {
      await revokeInvite.mutateAsync(inviteId);
      setRevokedCodes((prev) => [...prev, code]);
      toast.success('Convite cancelado. O código não funciona mais.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível cancelar o convite.');
    }
  };

  return (
    <PageContainer title="Gestão da comunidade" showBack withBottomNav={false}>
      <div className="px-6 py-6 space-y-8 pb-24">
        {community && <p className="type-label">{community.name}</p>}

        <section className="space-y-3">
          <h2 className="type-subtitle">Convidar</h2>
          {community && orgId && (
            <div className="grid grid-cols-1 gap-1">
              <InviteMembers organizationId={orgId} organizationName={community.name ?? ''} revokedCodes={revokedCodes} />
              <InviteMembers organizationId={orgId} organizationName={community.name ?? ''} role="instructor" revokedCodes={revokedCodes} />
            </div>
          )}
          {invites && invites.length > 0 && (
            <ul className="space-y-2 pt-2">
              {invites.map((invite) => (
                <li key={invite.id} className="flex items-center gap-3 bg-surface border border-line rounded-xl px-4 py-3">
                  <Ticket className="w-4 h-4 text-ink-muted shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="type-number text-ink tracking-[0.15em]">{formatInviteCode(invite.code)}</p>
                    <p className="text-xs text-ink-muted">
                      {invite.role === 'instructor' ? 'Instrutor' : 'Membro'} · usado {invite.uses}
                      {invite.max_uses ? ` de ${invite.max_uses}` : ''}
                      {invite.expires_at ? ` · até ${format(parseISO(invite.expires_at), 'dd/MM', { locale: ptBR })}` : ''}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Cancelar convite ${formatInviteCode(invite.code)}`}
                    onClick={() => handleRevoke(invite.id, invite.code)}
                    disabled={revokeInvite.isPending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="type-subtitle">
            Membros{members ? ` (${members.length})` : ''}
          </h2>
          {isLoadingMembers ? (
            <Spinner />
          ) : !members || members.length === 0 ? (
            <EmptyState icon={Users} title="Ninguém por aqui ainda" description="Convide os moradores ou sócios com um código." />
          ) : (
            <ul className="space-y-2">
              {members.map((m) => {
                const person = m.profile!;
                const name = person.full_name?.trim() || 'Sem nome';
                const editable = m.role !== 'owner' && person.id !== profile?.id;
                return (
                  <li key={person.id} className="flex items-center gap-3 bg-surface border border-line rounded-xl px-4 py-3">
                    <Avatar src={person.avatar_url} name={name} className="w-10 h-10" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">
                        {name}
                        {person.id === profile?.id ? ' (você)' : ''}
                      </p>
                    </div>
                    <StatusPill
                      text={ROLE_LABEL[m.role] ?? m.role}
                      variant={m.role === 'member' ? 'neutral' : m.role === 'instructor' ? 'success' : 'info'}
                    />
                    {editable && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label={`Opções de ${name}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-elevated border-line">
                          {ROLE_ACTIONS.filter((a) => a.role !== m.role).map((a) => (
                            <DropdownMenuItem key={a.action} onSelect={() => runAction(person.id, a.action, name)}>
                              {a.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-danger" onSelect={() => setToRemove({ id: person.id, name })}>
                            Remover da comunidade
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(open) => !open && setToRemove(null)}
        title="Remover da comunidade?"
        description={
          toRemove
            ? `${toRemove.name} deixa de ver a agenda e as inscrições futuras são canceladas. Para voltar, precisa de um convite novo.`
            : ''
        }
        confirmLabel="Remover"
        isDestructive
        isLoading={manageMember.isPending}
        onConfirm={async () => {
          if (toRemove) await runAction(toRemove.id, 'remove', toRemove.name);
          setToRemove(null);
        }}
      />
    </PageContainer>
  );
}
