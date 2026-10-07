import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';

export type Space = { id: string; name: string; space_kind: string | null; rules: string | null; archived_at: string | null };

/** Espaços oficiais da comunidade (o gestor também vê os arquivados) */
export function useSpaces(orgId: string | undefined, withArchived = false) {
  return useQuery({
    queryKey: ['community-spaces', orgId, withArchived],
    queryFn: async () => {
      let query = supabase.from('venues').select('id, name, space_kind, rules, archived_at').eq('organization_id', orgId!).eq('official', true).order('name');
      if (!withArchived) query = query.is('archived_at', null);
      const { data, error } = await query;
      if (error) throw error;
      return data as Space[];
    },
    enabled: !!orgId,
  });
}

export function useSpaceActions(orgId: string | undefined) {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['community-spaces', orgId] });
    void queryClient.invalidateQueries({ queryKey: ['community-venues', orgId] });
  };

  const save = useMutation({
    mutationFn: async (s: { id?: string | null; name: string; space_kind: string; rules: string }) => {
      const { error } = await supabase.rpc('save_community_space', {
        p_org: orgId!,
        p_space: s.id ?? null,
        p_name: s.name,
        p_space_kind: s.space_kind,
        p_rules: s.rules,
      });
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const archive = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase.rpc('archive_community_space', { p_space: id, p_archive: archived });
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  return { save, archive };
}

export type SpaceConflict = { session_id: string; title: string; start_time: string; end_time: string };

/** O que já está marcado no mesmo espaço e horário (aviso antes de publicar) */
export function useSpaceConflicts(spaceId: string | null, date: string, time: string, minutes: number, exclude?: string) {
  return useQuery({
    queryKey: ['space-conflicts', spaceId, date, time, minutes, exclude ?? null],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('space_conflicts', {
        p_space: spaceId!,
        p_date: date,
        p_start: time,
        p_minutes: minutes,
        p_exclude: exclude ?? null,
      });
      if (error) throw error;
      return (data ?? []) as SpaceConflict[];
    },
    enabled: !!spaceId && !!date && !!time && minutes > 0,
  });
}
