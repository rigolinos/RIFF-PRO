import { useState } from 'react';
import { Archive, ChevronRight, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
import { Textarea } from '@riff/core/ui/textarea';
import { chipClass } from '@riff/core/lib/chips';
import { cn } from '@riff/core/lib/utils';
import { useSpaceActions, useSpaces, type Space } from '@/hooks/useSpaces';
import { SPACE_KINDS, spaceErrorMessage, spaceKind } from '@/lib/spaces';

type Draft = { id: string | null; name: string; space_kind: string; rules: string };

/** Gestão: lista oficial de espaços da comunidade (criar, editar, arquivar) */
export function SpacesManager({ orgId }: { orgId: string }) {
  const { data: spaces } = useSpaces(orgId, true);
  const { save, archive } = useSpaceActions(orgId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const active = (spaces ?? []).filter((s) => !s.archived_at);
  const archived = (spaces ?? []).filter((s) => s.archived_at);

  const edit = (s: Space) => setDraft({ id: s.id, name: s.name, space_kind: s.space_kind ?? 'other', rules: s.rules ?? '' });

  const submit = async () => {
    if (!draft) return;
    try {
      await save.mutateAsync(draft);
      toast.success(draft.id ? 'Espaço atualizado.' : 'Espaço criado.');
      setDraft(null);
    } catch (error: unknown) {
      toast.error(spaceErrorMessage(error));
    }
  };

  const toggleArchive = async (s: Space, archivedNow: boolean) => {
    try {
      await archive.mutateAsync({ id: s.id, archived: archivedNow });
      toast.success(archivedNow ? `${s.name} arquivado. As atividades antigas continuam ligadas a ele.` : `${s.name} voltou para a lista.`);
      setDraft(null);
    } catch (error: unknown) {
      toast.error(spaceErrorMessage(error));
    }
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="type-subtitle">Espaços</h2>
        <p className="text-xs text-ink-muted mt-0.5">Quadras, piscina, salão… Quem cria um evento escolhe daqui, e o app avisa se o horário já estiver ocupado.</p>
      </div>

      {active.length > 0 && (
        <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
          {active.map((s) => {
            const k = spaceKind(s.space_kind);
            return (
              <li key={s.id}>
                <button type="button" onClick={() => edit(s)} className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-elevated">
                  <span className="w-9 h-9 rounded-xl bg-brand/15 text-brand flex items-center justify-center shrink-0">
                    <k.icon className="w-4 h-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink truncate">{s.name}</span>
                    <span className="block text-xs text-ink-muted truncate">{s.rules || k.label}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-ink-muted" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {draft ? (
        <div className="bg-surface border border-brand/40 rounded-2xl p-4 space-y-3">
          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            maxLength={60}
            placeholder="Nome do espaço. Ex: Quadra de tênis 1"
            aria-label="Nome do espaço"
            className="h-12 bg-elevated border-line"
          />
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de espaço">
            {SPACE_KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                role="radio"
                aria-checked={draft.space_kind === k.value}
                onClick={() => setDraft({ ...draft, space_kind: k.value })}
                className={cn(chipClass(draft.space_kind === k.value), 'inline-flex items-center gap-1.5')}
              >
                <k.icon className="w-4 h-4" /> {k.label}
              </button>
            ))}
          </div>
          <Textarea
            value={draft.rules}
            onChange={(e) => setDraft({ ...draft, rules: e.target.value })}
            maxLength={500}
            placeholder="Regras (opcional). Ex: uso até 22h; tênis só com sapato de quadra."
            aria-label="Regras do espaço"
            className="bg-elevated border-line resize-none h-20"
          />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={submit} disabled={save.isPending || draft.name.trim().length < 2}>
              {draft.id ? 'Salvar' : 'Criar espaço'}
            </Button>
          </div>
          {draft.id && (
            <button
              type="button"
              onClick={() => {
                const s = spaces?.find((x) => x.id === draft.id);
                if (s) void toggleArchive(s, true);
              }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-danger pt-1"
            >
              <Archive className="w-3.5 h-3.5" /> Arquivar este espaço
            </button>
          )}
        </div>
      ) : (
        <Button variant="secondary" className="w-full" onClick={() => setDraft({ id: null, name: '', space_kind: 'tennis', rules: '' })}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar espaço
        </Button>
      )}

      {archived.length > 0 && (
        <div className="space-y-2">
          <button type="button" onClick={() => setShowArchived((v) => !v)} className="text-xs font-semibold text-ink-muted underline underline-offset-4">
            {showArchived ? 'Esconder' : 'Ver'} arquivados ({archived.length})
          </button>
          {showArchived && (
            <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
              {archived.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-sm text-ink-muted flex-1 truncate">{s.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => toggleArchive(s, false)} disabled={archive.isPending}>
                    <RotateCcw className="w-4 h-4 mr-1" /> Trazer de volta
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
