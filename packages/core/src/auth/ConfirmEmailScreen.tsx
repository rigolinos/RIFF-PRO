import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, MailCheck } from 'lucide-react';
import { supabase } from '@riff/core/supabase/client';
import { AuthShell } from '@riff/core/layout/AuthShell';
import { Button } from '@riff/core/ui/button';
import { authErrorMessage } from '@riff/core/lib/authErrors';
import { safeRedirect } from '@riff/core/auth/redirect';
import { readSignupEmail } from '@riff/core/auth/signupEmail';

const WAIT = 60;

/**
 * Depois de criar a conta: "Confirme seu e-mail", com o endereço digitado, reenvio e o
 * caminho para entrar. Antes a pessoa caía no login com um aviso pequeno e tentava entrar
 * sem confirmar. Usada no Riff Pro e no Riff Clubes.
 */
export function ConfirmEmailScreen({ product }: { product: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as { email?: string; redirect?: string };
  const [email] = useState(() => state.email || readSignupEmail());
  const redirect = safeRedirect(state.redirect ?? null, '');
  const [wait, setWait] = useState(WAIT);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const resend = async () => {
    if (!email) return;
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/login?confirmed=true` },
    });
    setSending(false);
    if (error) {
      toast.error(authErrorMessage(error, 'Não foi possível reenviar agora. Tente de novo em alguns minutos.'));
      return;
    }
    toast.success('E-mail reenviado. Confira também a caixa de spam.');
    setWait(WAIT);
  };

  const login = () => navigate('/login?registered=true' + (redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''));

  return (
    <AuthShell
      product={product}
      label="Falta um passo"
      title="Confirme seu e-mail"
      subtitle="Enviamos um link para confirmar que o e-mail é seu. Sem essa confirmação, não dá para entrar."
      onBack={() => navigate('/signup')}
    >
      <div className="flex-1 space-y-4">
        <div className="bg-surface border border-line rounded-2xl p-5 flex items-start gap-3">
          <span className="w-11 h-11 rounded-xl bg-brand/15 text-brand flex items-center justify-center shrink-0">
            <MailCheck className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-ink-muted">Mandamos para</p>
            <p className="text-sm font-semibold text-ink break-all">{email || 'o e-mail que você cadastrou'}</p>
          </div>
        </div>
        <ol className="space-y-2 text-sm text-ink">
          {['Abra o e-mail do Riff (pode estar no spam ou em Promoções).', 'Toque em "Confirmar e-mail".', 'Volte aqui e entre com seu e-mail e senha.'].map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-elevated border border-line text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="pt-6 space-y-2">
        <Button size="lg" className="w-full" onClick={login}>
          Já confirmei, entrar
        </Button>
        <Button size="lg" variant="secondary" className="w-full" onClick={() => void resend()} disabled={!email || wait > 0 || sending}>
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : wait > 0 ? `Reenviar e-mail (${wait}s)` : 'Reenviar e-mail'}
        </Button>
        <button type="button" onClick={() => navigate('/signup')} className="w-full h-11 text-sm font-semibold text-ink-muted">
          Errei o e-mail
        </button>
      </div>
    </AuthShell>
  );
}
