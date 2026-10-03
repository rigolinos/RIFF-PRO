import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@riff/core/supabase/client';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
import { errorMessage } from '@riff/core/lib/utils';

const MESSAGES: Record<string, string> = {
  invalid_code: 'Código não encontrado. Confira com o seu condomínio ou clube.',
  expired: 'Este convite venceu. Peça um código novo ao gestor.',
  exhausted: 'Este convite já foi usado. Peça um código novo ao gestor.',
  removed: 'Seu acesso a esta comunidade foi encerrado pelo gestor.',
  unauthenticated: 'Entre na sua conta para usar o convite.',
};

// Morador digita o código do convite e entra na comunidade (join_organization)
export function JoinWithCode() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoining(true);
    try {
      const { data, error } = await supabase.rpc('join_organization', { p_code: code });
      if (error) throw error;
      const result = data as { success: boolean; code: string; name?: string };
      if (!result.success) {
        toast.error(MESSAGES[result.code] ?? 'Não foi possível usar o código.');
        return;
      }
      toast.success(result.code === 'already_member' ? `Você já faz parte de ${result.name}.` : `Bem-vindo a ${result.name}!`);
      setCode('');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Não foi possível usar o código.'));
    } finally {
      setIsJoining(false);
    }
  };

  if (!open) {
    return (
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        <KeyRound className="w-4 h-4 mr-2" /> Entrar com código de convite
      </Button>
    );
  }

  return (
    <form onSubmit={handleJoin} className="bg-surface border border-line rounded-2xl p-4 space-y-3">
      <label htmlFor="invite-code" className="type-label block">
        Código de convite
      </label>
      <Input
        id="invite-code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="XXXX-XXXX"
        autoComplete="off"
        autoCapitalize="characters"
        className="h-12 text-center tracking-[0.3em] font-semibold bg-elevated border-line"
      />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={isJoining || code.replace(/[^A-Za-z0-9]/g, '').length < 8}>
          {isJoining ? 'Entrando...' : 'Entrar'}
        </Button>
      </div>
    </form>
  );
}
