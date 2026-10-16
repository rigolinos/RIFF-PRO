import { useState } from 'react';
import { Ban, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { useBlockedIds, useBlockProfile } from '@riff/core/hooks/useModeration';
import { moderationError, REPORT_TITLES } from '@riff/core/lib/moderation';
import { ConfirmDialog } from './ConfirmDialog';
import { ReportDialog, type ReportTarget } from './ReportDialog';

const LINK = 'inline-flex items-center gap-1.5 min-h-11 px-2 text-xs font-semibold text-ink-muted active:text-ink';

interface ModerationActionsProps {
  /** O que pode ser denunciado aqui */
  report: ReportTarget;
  /** Pessoa que pode ser bloqueada (sem isso, só aparece "Denunciar") */
  block?: { profileId: string; name: string };
  /** O que o bloqueio faz neste app (o padrão é o texto do Riff Pro) */
  blockDescription?: string;
  /** Chamado quando a pessoa não está logada */
  onNeedLogin?: () => void;
  className?: string;
}

const PRO_BLOCK =
  'Vocês deixam de poder reservar atividades um do outro, e as atividades dessa pessoa somem das suas listas. Ela não é avisada. Você pode desbloquear quando quiser, em Perfil.';

/** Linha discreta com "Denunciar" e "Bloquear", para o rodapé de perfis, atividades e listas */
export function ModerationActions({ report, block, blockDescription = PRO_BLOCK, onNeedLogin, className = '' }: ModerationActionsProps) {
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const blocked = useBlockedIds();
  const blockProfile = useBlockProfile();
  const isBlocked = !!block && blocked.has(block.profileId);

  const guard = (action: () => void) => () => (onNeedLogin ? onNeedLogin() : action());

  const toggleBlock = (next: boolean) => {
    if (!block) return;
    blockProfile.mutate(
      { profileId: block.profileId, block: next },
      {
        onSuccess: () => {
          toast.success(next ? `${block.name} foi bloqueado.` : `${block.name} foi desbloqueado.`);
          setConfirmBlock(false);
        },
        onError: (error) => toast.error(moderationError(error, 'Não foi possível concluir. Tente de novo.')),
      },
    );
  };

  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-2 ${className}`}>
      <button type="button" className={LINK} onClick={guard(() => setReporting(report))}>
        <Flag className="w-3.5 h-3.5" /> {REPORT_TITLES[report.kind]}
      </button>
      {block && (
        <button
          type="button"
          className={LINK}
          disabled={blockProfile.isPending}
          onClick={guard(() => (isBlocked ? toggleBlock(false) : setConfirmBlock(true)))}
        >
          <Ban className="w-3.5 h-3.5" /> {isBlocked ? 'Desbloquear' : 'Bloquear'}
        </button>
      )}

      <ReportDialog target={reporting} onClose={() => setReporting(null)} />
      {block && (
        <ConfirmDialog
          open={confirmBlock}
          onOpenChange={setConfirmBlock}
          title={`Bloquear ${block.name}?`}
          description={blockDescription}
          confirmLabel="Bloquear"
          isDestructive
          isLoading={blockProfile.isPending}
          onConfirm={() => toggleBlock(true)}
        />
      )}
    </div>
  );
}
