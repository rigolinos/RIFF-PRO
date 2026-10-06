import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, GraduationCap, Share2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@riff/core/supabase/client';
import { Button } from '@riff/core/ui/button';
import { errorMessage } from '@riff/core/lib/utils';
import { BRAND } from '@/brand';
import { formatInviteCode } from '@/lib/invite';

interface InviteMembersProps {
  organizationId: string;
  organizationName: string;
  role?: 'member' | 'instructor';
  /** Códigos cancelados na tela de gestão: o painel do código some. */
  revokedCodes?: string[];
}

// Gestor gera um código de convite para moradores, sócios ou instrutores (create_invite, válido por 30 dias)
export function InviteMembers({ organizationId, organizationName, role = 'member', revokedCodes }: InviteMembersProps) {
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<string | null>(null);
  const code = created && !revokedCodes?.some((c) => formatInviteCode(c) === formatInviteCode(created)) ? formatInviteCode(created) : null;
  const [isCreating, setIsCreating] = useState(false);

  const message = code
    ? `Convite para ${role === 'instructor' ? 'conduzir atividades na' : 'participar da'} comunidade esportiva de ${organizationName} no ${BRAND.name}. ` +
      `Crie sua conta em ${window.location.origin} e use o código ${code}.`
    : '';

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_invite', { p_org: organizationId, p_role: role });
      if (error) throw error;
      setCreated((data as { code: string }).code);
      queryClient.invalidateQueries({ queryKey: ['community-invites', organizationId] });
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Não foi possível gerar o convite.'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Convite copiado!');
    } catch {
      toast.error('Não foi possível copiar. Anote o código.');
    }
  };

  const handleShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (!code) {
    const Icon = role === 'instructor' ? GraduationCap : UserPlus;
    return (
      <button
        type="button"
        onClick={handleCreate}
        disabled={isCreating}
        className="text-left bg-surface border border-line rounded-2xl p-4 space-y-2 active:scale-[.98] transition-transform disabled:opacity-60"
      >
        <span className="w-10 h-10 rounded-xl bg-brand/15 text-brand flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </span>
        <span className="block text-sm font-semibold text-ink">
          {isCreating ? 'Gerando…' : role === 'instructor' ? 'Convidar instrutor' : 'Convidar moradores'}
        </span>
        <span className="block text-xs text-ink-muted">
          {role === 'instructor' ? 'Para quem vai dar aulas' : 'Moradores e sócios'}
        </span>
      </button>
    );
  }

  return (
    <div className="col-span-2 bg-elevated border border-brand/40 rounded-2xl p-4 space-y-3">
      <p className="type-label">{role === 'instructor' ? 'Convite de instrutor' : 'Código de convite'} (vale 30 dias)</p>
      <p className="type-number text-2xl text-ink text-center tracking-[0.25em]">{code}</p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={handleCopy}>
          <Copy className="w-4 h-4 mr-1.5" /> Copiar
        </Button>
        <Button size="sm" className="flex-1" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-1.5" /> WhatsApp
        </Button>
      </div>
    </div>
  );
}
