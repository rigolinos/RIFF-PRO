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
import { LEGAL_DOCUMENTS } from '@riff/core/legal/documents';
import { errorMessage } from '@riff/core/lib/utils';

// Tela "Eu li e aceito": aparece antes de qualquer tela logada enquanto faltar
// aceitar a versão vigente de algum documento.
const AcceptTerms = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/feed';
  const { missing, isLoading, isOrganizer, accept, isAccepting } = useLegalAcceptance();
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
      key: 'terms',
      label: (
        <>
          Li e aceito os <DocLink path={LEGAL_DOCUMENTS.terms.path}>Termos de Uso</DocLink>.
        </>
      ),
    },
    {
      key: 'privacy',
      label: (
        <>
          Li e aceito a <DocLink path={LEGAL_DOCUMENTS.privacy.path}>Política de Privacidade</DocLink>.
        </>
      ),
    },
    isOrganizer
      ? {
          key: 'organizer_terms',
          label: (
            <>
              Li e aceito o <DocLink path={LEGAL_DOCUMENTS.organizer_terms.path}>Termo do Organizador</DocLink> e
              declaro que sou o único responsável pelas atividades que publico, pela segurança dos participantes e por
              pagamentos, cancelamentos e reembolsos.
            </>
          ),
        }
      : {
          key: 'participant_ack',
          label: (
            <>
              Entendo que cada atividade é de responsabilidade de quem a organiza, e que pagamento, cancelamento e
              reembolso são tratados diretamente com o organizador.
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
    <AuthShell product={BRAND.name} label="Antes de continuar" title="Combinados do Riff" subtitle="O Riff Pro conecta organizadores e participantes. Quem organiza a atividade é o responsável por ela.">
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
