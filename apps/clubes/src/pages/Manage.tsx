import { useState } from 'react';
import { Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, CalendarDays, ChevronRight, ClipboardCheck, GraduationCap, MoreVertical, Ticket, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@riff/core/hooks/useProfile';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { Avatar, BrandLines, ConfirmDialog, EmptyState, StatusPill } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@riff/core/ui/dropdown-menu';
import { useCommunity } from '@/hooks/useCommunity';
import { useMembers, useInvites, useManageActions, usePendingClose, type MemberAction } from '@/hooks/useManagement';
import { useUpcomingActivities } from '@/hooks/useActivities';
import { InviteMembers } from '@/components/InviteMembers';
import { SpacesManager } from '@/components/SpacesManager';
import { formatInviteCode } from '@/lib/invite';

const ROLE_LABEL: Record<string, string> = { owner: 'Responsável', admin: 'Gestor', instructor: 'Instrutor', member: 'Membro' };
const ROLE_ACTIONS: { action: MemberAction; role: string; label: string }[] = [
  { action: 'make_member', role: 'member', label: 'Tornar membro' },
  { action: 'make_instructor', role: 'instructor', label: 'Tornar instrutor' },
  { action: 'make_admin', role: 'admin', label: 'Tornar gestor' },
];

// Grupos da lista de membros, na ordem em que aparecem
const GROUPS: { title: string; roles: string[] }[] = [
  { title: 'Gestão', roles: ['owner', 'admin'] },
  { title: 'Instrutores', roles: ['instructor'] },
  { title: 'Moradores e sócios', roles: ['member'] },
];

const Spinner = () => (
  <div className="flex justify-center py-8">
    <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function Manage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { data: community, isLoading } = useCommunity(orgId);
  const { data: members, isLoading: isLoadingMembers } = useMembers(orgId);
  const { data: invites } = useInvites(orgId);
  const { manageMember, revokeInvite } = useManageActions(orgId);
  const [toRemove, setToRemove] = useState<{ id: string; name: string } | null>(null);
  const [revokedCodes, setRevokedCodes] = useState<string[]>([]);
  const { data: upcoming } = useUpcomingActivities(orgId ? [orgId] : undefined);
  const { data: pendingClose } = usePendingClose(orgId, true);

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

  const instructors = members?.filter((m) => m.role === 'instructor').length ?? 0;
  const stats = [
    { icon: Users, value: members?.length ?? 0, label: 'membros' },
    { icon: GraduationCap, value: instructors, label: instructors === 1 ? 'instrutor' : 'instrutores' },
    { icon: CalendarDays, value: upcoming?.length ?? 0, label: 'eventos' },
  ];

  return (
    <PageContainer withBottomNav={false}>
      {/* Cabeçalho de destaque */}
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
          <p className="type-label">Gestão</p>
          <h1 className="type-display mt-1 min-h-10">{community?.name ?? ''}</h1>
          <p className="text-sm text-ink-muted mt-1">
            {community ? `${community.kind === 'club' ? 'Clube' : 'Condomínio'} · ${community.role === 'owner' ? 'você é o responsável' : 'você é gestor'}` : ''}
          </p>
        </div>
      </section>

      {/* Números da comunidade, sobrepostos ao cabeçalho */}
      <div className="relative z-10 -mt-10 mx-4 grid grid-cols-3 divide-x divide-line bg-elevated border border-line rounded-2xl shadow-[var(--shadow-2)]">
        {stats.map((st) => (
          <div key={st.label} className="p-3 text-center">
            <st.icon className="w-4 h-4 text-brand mx-auto" />
            <p className="type-title leading-tight mt-1">{st.value}</p>
            <p className="text-xs text-ink-muted">{st.label}</p>
          </div>
        ))}
      </div>

      <div className="px-6 py-6 space-y-8 pb-24">
        {pendingClose && pendingClose.length > 0 && (
          <Link
            to={`/c/${orgId}`}
            className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-surface px-4 py-3"
          >
            <ClipboardCheck className="w-5 h-5 text-accent shrink-0" />
            <span className="text-sm text-ink flex-1">
              Falta fechar a presença de {pendingClose.length} evento{pendingClose.length > 1 ? 's' : ''}
            </span>
            <ChevronRight className="w-4 h-4 text-ink-muted" />
          </Link>
        )}

        {orgId && <SpacesManager orgId={orgId} />}

        <section className="space-y-3">
          <div>
            <h2 className="type-subtitle">Convidar</h2>
            <p className="text-xs text-ink-muted mt-0.5">Cada código vale 30 dias. Mande pelo WhatsApp ou copie.</p>
          </div>
          {community && orgId && (
            <div className="grid grid-cols-2 gap-3">
              <InviteMembers organizationId={orgId} organizationName={community.name ?? ''} revokedCodes={revokedCodes} />
              <InviteMembers organizationId={orgId} organizationName={community.name ?? ''} role="instructor" revokedCodes={revokedCodes} />
            </div>
          )}
          {invites && invites.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="type-label">Convites ativos</p>
              <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
                {invites.map((invite) => (
                  <li key={invite.id} className="flex items-center gap-3 px-4 py-3">
                    <Ticket className="w-4 h-4 text-brand shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="type-number text-ink tracking-[0.15em]">{formatInviteCode(invite.code)}</p>
                      <p className="text-xs text-ink-muted">
                        {invite.role === 'instructor' ? 'Instrutor' : 'Morador'} · usado {invite.uses}
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
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="type-subtitle">Membros{members ? ` (${members.length})` : ''}</h2>
          {isLoadingMembers ? (
            <Spinner />
          ) : !members || members.length === 0 ? (
            <EmptyState icon={Users} title="Ninguém por aqui ainda" description="Convide os moradores ou sócios com um código." />
          ) : (
            GROUPS.map((g) => {
              const list = members.filter((m) => g.roles.includes(m.role));
              if (!list.length) return null;
              return (
                <div key={g.title} className="space-y-2">
                  <p className="type-label">
                    {g.title} · {list.length}
                  </p>
                  <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
                    {list.map((m) => {
                      const person = m.profile!;
                      const name = person.full_name?.trim() || 'Sem nome';
                      const isMe = person.id === profile?.id;
                      const editable = m.role !== 'owner' && !isMe;
                      return (
                        <li key={person.id} className="flex items-center gap-3 px-4 py-3">
                          <Avatar src={person.avatar_url} name={name} className="w-10 h-10" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-ink truncate">{name}</p>
                            <p className="text-xs text-ink-muted">
                              {ROLE_LABEL[m.role] ?? m.role} · desde {format(parseISO(m.created_at), 'MMM yyyy', { locale: ptBR })}
                            </p>
                          </div>
                          {isMe && <StatusPill text="Você" variant="info" />}
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
                </div>
              );
            })
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
