import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Baby, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { ConfirmDialog, EmptyState } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
import { Checkbox } from '@riff/core/ui/checkbox';
import { CLUBES_LEGAL_DOCUMENTS } from '@riff/core/legal/clubes';
import { useDependents, ageOn, RELATIONSHIP_LABEL, type Relationship } from '@/hooks/useDependents';
import { todaySP } from '@/hooks/useCommunity';

const FIELD = 'h-12 bg-surface border-line';
const SELECT =
  'w-full h-12 rounded-md bg-surface border border-line px-3 text-ink focus:outline-none focus:border-brand/50';

export default function Dependents() {
  const { data: dependents, isLoading, isError, add, remove } = useDependents();
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [relationship, setRelationship] = useState<Relationship>('child');
  const [consent, setConsent] = useState(false);
  const [toRemove, setToRemove] = useState<{ id: string; name: string } | null>(null);
  const today = todaySP();

  const resetForm = () => {
    setFullName('');
    setBirthDate('');
    setRelationship('child');
    setConsent(false);
    setShowForm(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) return toast.error('Informe o nome do dependente.');
    if (!birthDate) return toast.error('Informe a data de nascimento.');
    if (!consent) return toast.error('Aceite o Termo do Responsável para continuar.');
    try {
      await add.mutateAsync({ fullName: fullName.trim(), birthDate, relationship });
      toast.success(`Dependente cadastrado: ${fullName.trim()}.`);
      resetForm();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível cadastrar o dependente.');
    }
  };

  return (
    <PageContainer title="Seus dependentes" showBack>
      <div className="px-6 py-6 space-y-6 pb-24">
        <p className="text-sm text-ink-muted">
          Menores de 18 anos não têm conta: você os cadastra aqui e os inscreve nas atividades abertas a menores das
          suas comunidades. Só você, quem conduz a atividade e o gestor veem o nome e a idade deles.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <EmptyState title="Não foi possível carregar seus dependentes" description="Tente novamente em instantes." />
        ) : dependents && dependents.length > 0 ? (
          <ul className="space-y-2">
            {dependents.map((d) => (
              <li key={d.id} className="flex items-center gap-3 bg-surface border border-line rounded-xl px-4 py-3">
                <Baby className="w-5 h-5 text-brand shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">{d.full_name}</p>
                  <p className="text-xs text-ink-muted">
                    {ageOn(d.birth_date, today)} anos · {RELATIONSHIP_LABEL[d.relationship as Relationship] ?? d.relationship}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remover ${d.full_name}`}
                  onClick={() => setToRemove({ id: d.id, name: d.full_name })}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          !showForm && (
            <EmptyState icon={Baby} title="Nenhum dependente" description="Cadastre filhos ou menores sob sua responsabilidade." />
          )
        )}

        {showForm ? (
          <form onSubmit={handleAdd} className="space-y-4 bg-surface border border-line rounded-2xl p-4">
            <h2 className="type-subtitle">Novo dependente</h2>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink">Nome completo</span>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} className={FIELD} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink">Data de nascimento</span>
              <Input type="date" max={today} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={FIELD} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink">Parentesco</span>
              <select value={relationship} onChange={(e) => setRelationship(e.target.value as Relationship)} className={SELECT}>
                {(Object.keys(RELATIONSHIP_LABEL) as Relationship[]).map((r) => (
                  <option key={r} value={r}>
                    {RELATIONSHIP_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-xl bg-elevated border border-line cursor-pointer">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <span className="text-sm text-ink leading-relaxed">
                Sou o responsável legal por este menor e aceito o{' '}
                <Link
                  to={CLUBES_LEGAL_DOCUMENTS.guardian_consent.path}
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  className="text-brand underline underline-offset-4"
                >
                  Termo do Responsável
                </Link>
                .
              </span>
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={resetForm}>
                Voltar
              </Button>
              <Button type="submit" className="flex-1" disabled={add.isPending || !consent}>
                {add.isPending ? 'Salvando…' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        ) : (
          <Button className="w-full" onClick={() => setShowForm(true)}>
            <Baby className="w-4 h-4 mr-2" /> Cadastrar dependente
          </Button>
        )}

        <p className="text-xs text-ink-muted">
          O Riff recomenda que menores sejam acompanhados por um adulto responsável durante as atividades.
        </p>
      </div>

      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(open) => !open && setToRemove(null)}
        title="Remover dependente?"
        description={
          toRemove
            ? `O nome e a data de nascimento de ${toRemove.name} são apagados e as inscrições futuras são canceladas. Não dá para desfazer.`
            : ''
        }
        cancelLabel="Voltar"
        confirmLabel="Remover"
        isDestructive
        isLoading={remove.isPending}
        onConfirm={async () => {
          if (!toRemove) return;
          try {
            await remove.mutateAsync(toRemove.id);
            toast.success('Dependente removido.');
          } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Não foi possível remover o dependente.');
          }
          setToRemove(null);
        }}
      />
    </PageContainer>
  );
}
