import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { useAuth } from '@riff/core/hooks/useAuth';
import type { ReportKind, ReportReason } from '@riff/core/lib/moderation';

const BLOCKS_KEY = ['my-blocks'];

/** Pessoas que eu bloqueei (só eu vejo) */
export function useMyBlocks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...BLOCKS_KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_blocks');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

/** Ids dos perfis bloqueados, para esconder das listas */
export function useBlockedIds() {
  const { data } = useMyBlocks();
  return useMemo(() => new Set((data ?? []).map((b) => b.profile_id)), [data]);
}

export function useBlockProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, block }: { profileId: string; block: boolean }) => {
      const { error } = block
        ? await supabase.rpc('block_profile', { p_profile: profileId })
        : await supabase.rpc('unblock_profile', { p_profile: profileId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BLOCKS_KEY }),
  });
}

export function useReportContent() {
  return useMutation({
    mutationFn: async (report: { kind: ReportKind; targetId: string; reason: ReportReason; details: string }) => {
      const { error } = await supabase.rpc('report_content', {
        p_kind: report.kind,
        p_target: report.targetId,
        p_reason: report.reason,
        p_details: report.details,
      });
      if (error) throw error;
    },
  });
}
