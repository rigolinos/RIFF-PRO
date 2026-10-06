import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@riff/core/hooks/useAuth';
import { AuthShell } from '@riff/core/layout/AuthShell';
import { Field, PasswordInput } from '@riff/core/domain/Field';
import { FIELD_CLASS } from '@riff/core/lib/fields';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
import { authErrorMessage } from '@riff/core/lib/authErrors';
import { safeRedirect } from '@riff/core/auth/redirect';
import { BRAND } from '@/brand';

const Signup = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signUp(email, password, fullName, 'student');
    setIsLoading(false);
    if (error) {
      toast.error(authErrorMessage(error, 'Não foi possível criar a conta. Tente de novo.'));
      return;
    }
    const redirect = safeRedirect(params.get('redirect'), '');
    navigate('/login?registered=true' + (redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''));
  };

  return (
    <AuthShell
      product={BRAND.name}
      label="Criar conta"
      title="Entre para a sua comunidade"
      subtitle="Crie sua conta e use o código de convite do seu condomínio ou clube. Se já usa o Riff Pro, entre com a mesma conta."
      onBack={() => navigate('/')}
      footer={
        <>
          Já tem conta?{' '}
          <Link to="/login" className="text-brand font-semibold underline underline-offset-4">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <Field label="Nome completo" htmlFor="signup-name">
          <Input
            id="signup-name"
            autoComplete="name"
            placeholder="Seu nome"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className={FIELD_CLASS}
          />
        </Field>
        <Field label="E-mail" htmlFor="signup-email">
          <Input
            id="signup-email"
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
        <Field
          label="Senha"
          htmlFor="signup-password"
          hint={password && password.length < 6 ? `Faltam ${6 - password.length} caracteres` : 'Mínimo de 6 caracteres'}
        >
          <PasswordInput
            id="signup-password"
            autoComplete="new-password"
            placeholder="Crie uma senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full mt-2 shadow-[var(--shadow-cta)]" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar conta'}
        </Button>
        <p className="text-center text-xs text-ink-muted leading-relaxed">
          Depois de criar a conta, você lê e aceita os{' '}
          <Link to="/termos" className="text-brand underline underline-offset-4">
            Termos de Uso
          </Link>{' '}
          e a{' '}
          <Link to="/privacidade" className="text-brand underline underline-offset-4">
            Política de Privacidade
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  );
};

export default Signup;
