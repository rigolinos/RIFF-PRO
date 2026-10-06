import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@riff/core/hooks/useAuth';
import { AuthShell } from '@riff/core/layout/AuthShell';
import { Field, PasswordInput } from '@riff/core/domain/Field';
import { FIELD_CLASS } from '@riff/core/lib/fields';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
import { authErrorMessage } from '@riff/core/lib/authErrors';
import { safeRedirect } from '@riff/core/auth/redirect';

/** Entrar (igual no Riff Pro e no Riff Clubes: a conta é a mesma). */
export function LoginScreen({ product, home, subtitle }: { product: string; home: string; subtitle: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const notice =
    params.get('registered') === 'true'
      ? 'Conta criada! Abra o link que enviamos para o seu e-mail e depois entre aqui.'
      : params.get('confirmed') === 'true'
        ? 'E-mail confirmado! Agora é só entrar.'
        : null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast.error(authErrorMessage(error, 'Não foi possível entrar. Tente de novo.'));
      return;
    }
    navigate(safeRedirect(params.get('redirect'), home), { replace: true });
  };

  const query = params.toString();

  return (
    <AuthShell
      product={product}
      label="Entrar"
      title="Bem-vindo de volta"
      subtitle={subtitle}
      onBack={() => navigate('/')}
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to={query ? `/signup?${query}` : '/signup'} className="text-brand font-semibold underline underline-offset-4">
            Criar conta
          </Link>
        </>
      }
    >
      {notice && (
        <p className="mb-5 flex items-start gap-2 rounded-2xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-ink">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" /> {notice}
        </p>
      )}

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <Field label="E-mail" htmlFor="login-email">
          <Input
            id="login-email"
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
        <Field label="Senha" htmlFor="login-password">
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Link to="/forgot-password" className="self-end text-sm font-medium text-brand underline underline-offset-4">
          Esqueci minha senha
        </Link>
        <Button type="submit" size="lg" className="w-full mt-2 shadow-[var(--shadow-cta)]" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
        </Button>
      </form>
    </AuthShell>
  );
}
