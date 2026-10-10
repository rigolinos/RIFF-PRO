import { useState } from 'react';
import { toast } from 'sonner';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@riff/core/ui/drawer';
import { Button } from '@riff/core/ui/button';
import { Textarea } from '@riff/core/ui/textarea';
import { useReportContent } from '@riff/core/hooks/useModeration';
import { moderationError, REPORT_REASONS, REPORT_TITLES, type ReportKind, type ReportReason } from '@riff/core/lib/moderation';

export type ReportTarget = { kind: ReportKind; id: string };

/** Denúncia de perfil, atividade ou avaliação: motivo e, se quiser, um relato curto */
export function ReportDialog({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const report = useReportContent();

  const close = () => {
    setReason(null);
    setDetails('');
    onClose();
  };

  const send = () => {
    if (!target || !reason) return;
    report.mutate(
      { kind: target.kind, targetId: target.id, reason, details },
      {
        onSuccess: () => {
          toast.success('Denúncia enviada. A equipe Riff vai analisar.');
          close();
        },
        onError: (error) => toast.error(moderationError(error, 'Não foi possível enviar a denúncia. Tente de novo.')),
      },
    );
  };

  return (
    <Drawer open={!!target} onOpenChange={(open) => !open && close()}>
      <DrawerContent className="bg-bg border-line">
        {target && (
          <div className="mx-auto w-full max-w-[420px] px-6 pb-8 space-y-4">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle className="type-title">{REPORT_TITLES[target.kind]}</DrawerTitle>
              <DrawerDescription className="text-sm text-ink-muted">
                Conte o que está errado. Quem você denuncia não fica sabendo quem denunciou.
              </DrawerDescription>
            </DrawerHeader>

            <div className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden" role="radiogroup" aria-label="Motivo">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={reason === r.value}
                  onClick={() => setReason(r.value)}
                  className="w-full flex items-center gap-3 px-4 min-h-11 py-2.5 text-left text-sm text-ink active:bg-elevated"
                >
                  <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${reason === r.value ? 'border-brand bg-brand' : 'border-line'}`} />
                  {r.label}
                </button>
              ))}
            </div>

            <label className="block space-y-2">
              <span className="type-label">O que aconteceu (opcional)</span>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Escreva o que ajudar a equipe a entender"
                className="bg-surface border-line"
              />
            </label>

            <p className="text-xs text-ink-muted">Se alguém estiver em perigo agora, ligue 190.</p>

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={close} disabled={report.isPending}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={send} disabled={!reason || report.isPending}>
                {report.isPending ? 'Enviando...' : 'Enviar denúncia'}
              </Button>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
