import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight, KeyRound } from 'lucide-react';
import { JoinWithCode } from '@/components/JoinWithCode';

/**
 * Quem ainda não está em nenhum grupo: duas portas do mesmo tamanho. Antes só havia o
 * código de convite, e "meu condomínio ainda não está no Riff" ficava escondido.
 */
export function FirstAccess() {
  const [withCode, setWithCode] = useState(false);
  return (
    <section className="space-y-3">
      <p className="text-sm text-ink-muted">Cada condomínio ou clube tem o próprio grupo, com a agenda que só os membros veem.</p>
      {withCode ? (
        <JoinWithCode defaultOpen />
      ) : (
        <button
          type="button"
          onClick={() => setWithCode(true)}
          className="w-full flex items-center gap-3 rounded-2xl border border-brand/50 bg-surface px-4 py-4 text-left active:scale-[.99] transition-transform"
        >
          <span className="w-11 h-11 rounded-xl bg-brand text-brand-ink flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Tenho um código de convite</span>
            <span className="block text-xs text-ink-muted">O síndico, o gestor do clube ou um vizinho mandou.</span>
          </span>
          <ChevronRight className="w-5 h-5 text-ink-muted shrink-0" />
        </button>
      )}
      <Link
        to="/cadastrar-comunidade"
        className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-4 active:scale-[.99] transition-transform"
      >
        <span className="w-11 h-11 rounded-xl bg-elevated text-brand flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">Meu condomínio ou clube ainda não está no Riff</span>
          <span className="block text-xs text-ink-muted">Peça o cadastro em 2 minutos. A equipe Riff confirma com o responsável.</span>
        </span>
        <ChevronRight className="w-5 h-5 text-ink-muted shrink-0" />
      </Link>
    </section>
  );
}
