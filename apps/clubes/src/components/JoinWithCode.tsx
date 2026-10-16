import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
import { useJoinCommunity } from '@/hooks/useJoinCommunity';

// Morador digita o código do convite e entra no grupo (join_organization)
export function JoinWithCode({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [code, setCode] = useState('');
  const join = useJoinCommunity();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await join.mutateAsync(code);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    setCode('');
    setOpen(false);
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
        <Button type="submit" className="flex-1" disabled={join.isPending || code.replace(/[^A-Za-z0-9]/g, '').length < 8}>
          {join.isPending ? 'Entrando...' : 'Entrar'}
        </Button>
      </div>
    </form>
  );
}
