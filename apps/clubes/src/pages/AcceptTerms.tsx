import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { AuthShell } from '@riff/core/layout/AuthShell';
import { cn } from '@riff/core/lib/utils';
import { BRAND } from '@/brand';
import { Button } from '@riff/core/ui/button';
import { Checkbox } from '@riff/core/ui/checkbox';
import { useLegalAcceptance } from '@riff/core/hooks/useLegalAcceptance';
import { CLUBES_LEGAL_DOCUMENTS } from '@riff/core/legal/clubes';
import { errorMessage } from '@riff/core/lib/utils';

// Tela "Eu li e aceito": aparece antes de qualquer tela logada enquanto faltar
// aceitar a versão vigente de algum documento.
const AcceptTerms = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/inicio';
  const { missing, isLoading, accept, isAccepting } = useLegalAcceptance();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (missing.length === 0) return <Navigate to={next} replace />;

  const items = [
    {
      key: 'clubes_terms',
      label: (
        <>
          Li e aceito os <DocLink path={CLUBES_LEGAL_DOCUMENTS.clubes_terms.path}>Termos de Uso</DocLink>.
        </>
      ),
    },
    {
      key: 'clubes_privacy',
      label: (
        <>
          Li e aceito a <DocLink path={CLUBES_LEGAL_DOCUMENTS.clubes_privacy.path}>Política de Privacidade</DocLink>.
        </>
      ),
    },
    {
      key: 'participant_ack',
      label: (
        <>
          Entendo que as atividades acontecem nas áreas do meu condomínio ou clube, sob responsabilidade de quem
          as organiza e do condomínio ou clube, e que o Riff recomenda o acompanhamento de um maior de idade para menores.
        </>
      ),
    },
  ];

  const allChecked = items.every((item) => checked[item.key]);

  const handleAccept = async () => {
    try {
      await accept(missing);
      navigate(next, { replace: true });
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Não foi possível registrar o aceite. Tente novamente.'));
    }
  };

  return (
    <AuthShell product={BRAND.name} label="Antes de continuar" title="Combinados do Riff" subtitle="O Riff Clubes organiza as atividades esportivas do seu condomínio ou clube.">
      <div className="space-y-3 flex-1">
        {items.map((item) => (
          <label
            key={item.key}
            className={cn(
              'flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors',
              checked[item.key] ? 'bg-brand/10 border-brand/50' : 'bg-surface border-line',
            )}
          >
            <Checkbox
              checked={!!checked[item.key]}
              onCheckedChange={(value) => setChecked((prev) => ({ ...prev, [item.key]: value === true }))}
              className="mt-0.5"
            />
            <span className="text-sm text-ink leading-relaxed">{item.label}</span>
          </label>
        ))}
      </div>

      <div className="pt-6 space-y-2">
        <Button size="lg" onClick={handleAccept} disabled={!allChecked || isAccepting} className="w-full">
          {isAccepting ? 'Registrando…' : allChecked ? 'Aceitar e continuar' : `Marque os ${items.length} itens para continuar`}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
          <ShieldCheck className="w-3.5 h-3.5" /> Guardamos a data e a versão do que você aceitou.
        </p>
      </div>
    </AuthShell>
  );
};

function DocLink({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <Link
      to={path}
      target="_blank"
      onClick={(e) => e.stopPropagation()}
      className="text-brand underline underline-offset-4"
    >
      {children}
    </Link>
  );
}

export default AcceptTerms;
