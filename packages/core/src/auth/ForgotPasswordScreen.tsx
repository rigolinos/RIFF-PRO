import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@riff/core/supabase/client';
import { AuthShell } from '@riff/core/layout/AuthShell';
import { Field } from '@riff/core/domain/Field';
import { FIELD_CLASS } from '@riff/core/lib/fields';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
import { authErrorMessage } from '@riff/core/lib/authErrors';

/** Recuperar a senha por e-mail (igual nos dois apps). */
export function ForgotPasswordScreen({ product }: { product: string }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (error) {
      toast.error(authErrorMessage(error, 'Não foi possível enviar o e-mail. Tente de novo.'));
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell product={product} label="Senha" title="Confira seu e-mail" onBack={() => navigate('/login')}>
        <div className="bg-surface border border-line rounded-2xl p-5 text-center space-y-3">
          <span className="w-14 h-14 rounded-full bg-brand/15 text-brand flex items-center justify-center mx-auto">
            <Mail className="w-7 h-7" />
          </span>
          <p className="text-sm text-ink leading-relaxed">
            Se houver uma conta com <strong className="break-all">{email}</strong>, o link para criar uma nova senha chega em
            instantes.
          </p>
          <p className="text-xs text-ink-muted">Não chegou? Veja a caixa de spam ou tente de novo em um minuto.</p>
        </div>
        <Button size="lg" className="w-full mt-6" onClick={() => navigate('/login')}>
          Voltar para entrar
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      product={product}
      label="Senha"
      title="Esqueceu a senha?"
      subtitle="Sem problema. Informe o e-mail da conta e enviamos um link para criar uma nova."
      onBack={() => navigate(-1)}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="E-mail da conta" htmlFor="forgot-email">
          <Input
            id="forgot-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={FIELD_CLASS}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full mt-2" disabled={isLoading || !email}>
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar link'}
        </Button>
      </form>
    </AuthShell>
  );
}
