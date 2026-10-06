import { useQuery } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';
import { todaySP } from '@/hooks/useCommunity';

const ACTIVITY_FIELDS =
  'id, professional_id, organization_id, minors_allowed, min_age, title, description, date, start_time, duration_minutes, ' +
  'location_name, max_participants, current_participants, kind, status, cover_image_url, ' +
  'category:categories(name, emoji, slug), ' +
  'professional:profiles!sessions_professional_id_fkey(full_name, avatar_url), ' +
  'organization:organizations(name, kind)';

type ActivityRow = {
  id: string;
  professional_id: string;
  organization_id: string | null;
  minors_allowed: boolean;
  min_age: number | null;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  duration_minutes: number | null;
  location_name: string | null;
  max_participants: number | null;
  current_participants: number | null;
  kind: string;
  status: string | null;
  cover_image_url: string | null;
  category: { name: string; emoji: string | null; slug: string | null } | null;
  professional: { full_name: string | null; avatar_url: string | null } | null;
  organization: { name: string | null; kind: string } | null;
};

/** Quem confirmou presença: só adultos pelo nome curto; menores só na contagem */
export type Participants = {
  /** id nulo = pessoa no modo reservado (aparece como "Membro") */
  people: { id: string | null; name: string; avatar_url: string | null }[];
  count: number;
  dependents: number;
};

export type Activity = ActivityRow & {
  participants: Participants;
  /** Inscrição da própria pessoa (sem dependente) */
  myBookingId: string | null;
  /** dependent_id -> booking_id das inscrições dos dependentes da pessoa */
  dependentBookings: Record<string, string>;
};

/**
 * Junta às atividades as inscrições da pessoa e dos dependentes dela, e quem vai
 * (`peopleLimit` fotos por evento; sem limite na página do evento).
 */
async function withMyBookings(rows: ActivityRow[], profileId: string, peopleLimit: number | null = 3): Promise<Activity[]> {
  const ids = rows.map((s) => s.id);
  if (!ids.length) return [];
  const { data: who, error: whoError } = await supabase.rpc('activity_participants', {
    p_sessions: ids,
    ...(peopleLimit ? { p_limit: peopleLimit } : {}),
  });
  if (whoError) throw whoError;
  const whoBySession = new Map((who ?? []).map((w) => [w.session_id, w]));
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, session_id, dependent_id')
    .eq('student_id', profileId)
    .in('session_id', ids)
    .in('status', ['pending', 'confirmed']);
  if (error) throw error;
  return rows.map((s) => {
    const mine = (bookings ?? []).filter((b) => b.session_id === s.id);
    const w = whoBySession.get(s.id);
    return {
      ...s,
      participants: {
        people: (w?.people ?? []) as Participants['people'],
        count: w?.people_count ?? 0,
        dependents: w?.dependents ?? 0,
      },
      myBookingId: mine.find((b) => !b.dependent_id)?.id ?? null,
      dependentBookings: Object.fromEntries(mine.filter((b) => b.dependent_id).map((b) => [b.dependent_id!, b.id])),
    };
  });
}

/** Comunidades (condomínio ou clube) de que a pessoa é membro ativo. */
export function useMyCommunities() {
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['communities', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('role, organization:organizations(id, name, kind)')
        .eq('profile_id', profile!.id)
        .eq('status', 'active');
      if (error) throw error;
      return (data ?? [])
        .filter((m) => m.organization && ['condo', 'club'].includes(m.organization.kind))
        .map((m) => ({ ...m.organization!, role: m.role, isAdmin: m.role === 'owner' || m.role === 'admin' }));
    },
    enabled: !!profile?.id,
  });
}

export type MyCommunity = NonNullable<ReturnType<typeof useMyCommunities>['data']>[number];

/** Próximas atividades das comunidades indicadas (todas as da pessoa, ou uma só). */
export function useUpcomingActivities(orgIds: string[] | undefined) {
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['community-agenda', orgIds?.slice().sort().join(','), profile?.id],
    queryFn: async () => {
      if (!orgIds?.length) return [];
      const { data, error } = await supabase
        .from('sessions')
        .select(ACTIVITY_FIELDS)
        .in('organization_id', orgIds)
        .in('status', ['active', 'full'])
        .gte('date', todaySP())
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      const now = Date.now();
      // hoje: só o que ainda não começou (data e hora de São Paulo, UTC-3)
      const rows = ((data ?? []) as unknown as ActivityRow[]).filter(
        (s) => new Date(`${s.date}T${s.start_time}-03:00`).getTime() > now,
      );
      return withMyBookings(rows, profile!.id);
    },
    enabled: !!orgIds && !!profile?.id,
  });
}

/** Uma atividade (só membros da comunidade enxergam: RLS). */
export function useActivity(id: string | undefined) {
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['community-agenda', 'activity', id, profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('sessions').select(ACTIVITY_FIELDS).eq('id', id!).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [item] = await withMyBookings([data as unknown as ActivityRow], profile!.id, null);
      return item;
    },
    enabled: !!id && !!profile?.id,
  });
}

/** Agenda pessoal: inscrições (da pessoa e dos dependentes) e atividades que ela organiza. */
export function useMyAgenda() {
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['community-agenda', 'mine', profile?.id],
    queryFn: async () => {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(
          'id, status, attendance_status, dependent:dependents!bookings_dependent_id_fkey(full_name), ' +
            'session:sessions(id, title, date, start_time, location_name, status, kind, organization:organizations(name), category:categories(slug))',
        )
        .eq('student_id', profile!.id)
        .eq('product', 'clubes')
        .in('status', ['pending', 'confirmed', 'completed', 'no_show'])
        .order('created_at', { ascending: false });
      if (error) throw error;

      const { data: organizing, error: orgError } = await supabase
        .from('sessions')
        .select('id, title, date, start_time, location_name, status, current_participants, max_participants, organization:organizations(name), category:categories(slug)')
        .eq('professional_id', profile!.id)
        .eq('product', 'clubes')
        .in('status', ['active', 'full'])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      if (orgError) throw orgError;

      type BookingRow = {
        id: string;
        status: string;
        attendance_status: string | null;
        dependent: { full_name: string | null } | null;
        session: {
          id: string;
          title: string;
          date: string;
          start_time: string;
          location_name: string | null;
          status: string | null;
          kind: string;
          organization: { name: string | null } | null;
          category: { slug: string | null } | null;
        } | null;
      };
      const rows = ((bookings ?? []) as unknown as BookingRow[]).filter((b) => b.session);
      const now = Date.now();
      const startOf = (s: { date: string; start_time: string }) => new Date(`${s.date}T${s.start_time}-03:00`).getTime();
      const upcoming = rows
        .filter((b) => ['pending', 'confirmed'].includes(b.status) && startOf(b.session!) > now)
        .sort((a, b) => startOf(a.session!) - startOf(b.session!));
      const past = rows
        .filter((b) => !upcoming.includes(b))
        .sort((a, b) => startOf(b.session!) - startOf(a.session!))
        .slice(0, 30);
      return { upcoming, past, organizing: organizing ?? [] };
    },
    enabled: !!profile?.id,
  });
}
