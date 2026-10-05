import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';
import { todaySP } from '@/hooks/useCommunity';

export type MemberAction = 'make_member' | 'make_instructor' | 'make_admin' | 'remove';
export type Attendance = 'present' | 'late' | 'absent' | 'excused';

const MANAGE_ERRORS: Record<string, string> = {
  forbidden: 'Só o gestor da comunidade pode fazer isso.',
  cannot_change_self: 'Você não pode alterar o seu próprio papel.',
  cannot_change_owner: 'O responsável pela comunidade não pode ser alterado.',
  not_a_member: 'Esta pessoa não faz mais parte da comunidade.',
};

const CLOSE_ERRORS: Record<string, string> = {
  forbidden: 'Só quem conduz a atividade ou o gestor pode fechar a presença.',
  already_closed: 'Esta atividade já foi encerrada.',
  session_not_started: 'A atividade ainda não começou.',
  not_a_community_session: 'Esta atividade não é de uma comunidade.',
};

const translate = (map: Record<string, string>, error: { message?: string }, fallback: string) => {
  const key = Object.keys(map).find((k) => error.message?.includes(k));
  return new Error(key ? map[key] : fallback);
};

/** Membros ativos da comunidade (só o gestor enxerga a lista toda: RLS). */
export function useMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: ['community-members', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('role, created_at, profile:profiles!organization_members_profile_id_fkey(id, full_name, avatar_url)')
        .eq('organization_id', orgId!)
        .eq('status', 'active')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).filter((m) => m.profile);
    },
    enabled: !!orgId,
  });
}

/** Convites ainda válidos (não revogados nem vencidos). */
export function useInvites(orgId: string | undefined) {
  return useQuery({
    queryKey: ['community-invites', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_invites')
        .select('id, code, role, uses, max_uses, expires_at')
        .eq('organization_id', orgId!)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const now = Date.now();
      return (data ?? []).filter(
        (i) => (!i.expires_at || new Date(i.expires_at).getTime() > now) && (i.max_uses == null || i.uses < i.max_uses),
      );
    },
    enabled: !!orgId,
  });
}

export function useManageActions(orgId: string | undefined) {
  const queryClient = useQueryClient();

  const manageMember = useMutation({
    mutationFn: async ({ profileId, action }: { profileId: string; action: MemberAction }) => {
      const { error } = await supabase.rpc('manage_member', { p_org: orgId!, p_profile: profileId, p_action: action });
      if (error) throw translate(MANAGE_ERRORS, error, 'Não foi possível atualizar o membro.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-members', orgId] });
      queryClient.invalidateQueries({ queryKey: ['community-agenda'] });
    },
  });

  const revokeInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase.rpc('revoke_invite', { p_invite: inviteId });
      if (error) throw translate(MANAGE_ERRORS, error, 'Não foi possível cancelar o convite.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-invites', orgId] }),
  });

  return { manageMember, revokeInvite };
}

/**
 * Atividades que já passaram e ainda esperam a presença. O gestor vê todas;
 * o instrutor, só as que conduz.
 */
export function usePendingClose(orgId: string | undefined, isAdmin: boolean) {
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['community-pending-close', orgId, profile?.id, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('sessions')
        .select('id, title, date, start_time, current_participants, category:categories(slug)')
        .eq('organization_id', orgId!)
        .in('status', ['active', 'full'])
        .lte('date', todaySP())
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });
      if (!isAdmin) query = query.eq('professional_id', profile!.id);
      const { data, error } = await query;
      if (error) throw error;
      const now = Date.now();
      // date + horário são de São Paulo (UTC-3, sem horário de verão)
      return (data ?? []).filter((s) => new Date(`${s.date}T${s.start_time}-03:00`).getTime() <= now);
    },
    enabled: !!orgId && !!profile?.id,
  });
}

/** Atividade e inscritos, para quem conduz ou para o gestor. */
export function useRoster(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['community-roster', sessionId],
    queryFn: async () => {
      const { data: session, error } = await supabase
        .from('sessions')
        .select('id, title, date, start_time, status, organization_id, professional_id, max_participants, current_participants, location_name, category:categories(slug)')
        .eq('id', sessionId!)
        .maybeSingle();
      if (error) throw error;
      if (!session) return null;

      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status, attendance_status, created_at, student:profiles!bookings_student_id_fkey(id, full_name, avatar_url), dependent:dependents!bookings_dependent_id_fkey(full_name, birth_date)')
        .eq('session_id', sessionId!)
        .in('status', ['pending', 'confirmed', 'completed', 'no_show'])
        .order('created_at', { ascending: true });
      if (bookingsError) throw bookingsError;
      return { session, bookings: bookings ?? [] };
    },
    enabled: !!sessionId,
  });
}

export function useCloseActivity(orgId: string | undefined, sessionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ attendance, happened }: { attendance: Record<string, Attendance>; happened: boolean }) => {
      const { error } = await supabase.rpc('close_community_session', {
        p_session_id: sessionId!,
        p_attendance: Object.entries(attendance).map(([booking_id, status]) => ({ booking_id, status })),
        p_happened: happened,
      });
      if (error) throw translate(CLOSE_ERRORS, error, 'Não foi possível encerrar a atividade.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-roster', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['community-pending-close', orgId] });
      queryClient.invalidateQueries({ queryKey: ['community-agenda'] });
    },
  });
}
