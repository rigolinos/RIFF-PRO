import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';

const MESSAGES: Record<string, string> = {
  invalid_code: 'Código não encontrado. Confira com o seu condomínio ou clube.',
  expired: 'Este convite venceu. Peça um código novo ao gestor.',
  exhausted: 'Este convite já foi usado. Peça um código novo ao gestor.',
  removed: 'Seu acesso a este grupo foi encerrado pelo gestor.',
  unauthenticated: 'Entre na sua conta para usar o convite.',
};

export type JoinResult = { ok: boolean; message: string };

/** Entrar num grupo pelo código de convite (join_organization), com a mensagem certa para cada caso */
export function useJoinCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string): Promise<JoinResult> => {
      const { data, error } = await supabase.rpc('join_organization', { p_code: code });
      if (error) return { ok: false, message: 'Não foi possível usar o código. Tente de novo.' };
      const result = data as { success: boolean; code: string; name?: string };
      if (!result.success) return { ok: false, message: MESSAGES[result.code] ?? 'Não foi possível usar o código.' };
      return {
        ok: true,
        message: result.code === 'already_member' ? `Você já faz parte de: ${result.name}.` : `Pronto! Agora você faz parte de: ${result.name}.`,
      };
    },
    onSuccess: (r) => {
      if (!r.ok) return;
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
      void queryClient.invalidateQueries({ queryKey: ['community'] });
      void queryClient.invalidateQueries({ queryKey: ['community-agenda'] });
    },
  });
}
