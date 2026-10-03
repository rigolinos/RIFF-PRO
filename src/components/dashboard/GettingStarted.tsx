import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Wallet, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GettingStartedProps {
  profile: {
    avatar_url?: string | null;
    bio?: string | null;
    public_slug?: string | null;
    pix_key?: string | null;
    whatsapp_number?: string | null;
  } | null | undefined;
  totalSessions: number;
  hasSharedLink: boolean;
  onShare: () => void;
}

// Aviso de Pix: sem a chave, quem reserva cai no "combine o pagamento com o organizador".
export function PixMissingBanner() {
  const navigate = useNavigate();
  return (
    <section className="bg-accent/10 border border-accent/40 rounded-2xl p-4 flex gap-3 items-start">
      <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
        <Wallet className="w-5 h-5 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="type-subtitle text-ink">Cadastre sua chave Pix para receber</h2>
        <p className="text-sm text-ink-muted mt-1">
          Sem ela, quem reserva suas atividades não vê como pagar pelo app.
        </p>
        <Button size="sm" className="mt-3" onClick={() => navigate('/profile/edit#pix')}>
          Cadastrar Pix
        </Button>
      </div>
    </section>
  );
}

// Primeiros passos do organizador; some quando tudo estiver feito.
export function GettingStarted({ profile, totalSessions, hasSharedLink, onShare }: GettingStartedProps) {
  const navigate = useNavigate();

  const steps = [
    { key: 'pix', label: 'Cadastrar sua chave Pix', done: !!profile?.pix_key, action: () => navigate('/profile/edit#pix') },
    { key: 'whatsapp', label: 'Informar seu WhatsApp', done: !!profile?.whatsapp_number, action: () => navigate('/profile/edit#pix') },
    { key: 'photo', label: 'Adicionar uma foto de perfil', done: !!profile?.avatar_url, action: () => navigate('/profile/edit') },
    { key: 'bio', label: 'Escrever sua bio', done: !!profile?.bio?.trim(), action: () => navigate('/profile/edit') },
    { key: 'slug', label: 'Escolher seu link (riff.pro/@seu-nome)', done: !!profile?.public_slug, action: () => navigate('/profile/edit') },
    { key: 'first', label: 'Publicar sua primeira atividade', done: totalSessions > 0, action: () => navigate('/create-session') },
    { key: 'share', label: 'Compartilhar seu link no Instagram ou WhatsApp', done: hasSharedLink, action: onShare },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <section className="bg-surface border border-line rounded-2xl p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="type-subtitle text-ink">Primeiros passos</h2>
        <span className="type-label">
          {doneCount} de {steps.length}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-line overflow-hidden mb-3" aria-hidden>
        <div className="h-full bg-brand rounded-full" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ul className="divide-y divide-line">
        {steps.map((step) => (
          <li key={step.key}>
            <button
              onClick={step.action}
              disabled={step.done}
              className="w-full flex items-center gap-3 py-3 text-left disabled:cursor-default"
            >
              {step.done ? (
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-ink-muted shrink-0" />
              )}
              <span className={`flex-1 text-sm ${step.done ? 'text-ink-muted line-through' : 'text-ink'}`}>{step.label}</span>
              {!step.done && <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
