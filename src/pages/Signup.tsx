import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarPlus, Loader2, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@riff/core/hooks/useAuth';
import { AuthShell } from '@riff/core/layout/AuthShell';
import { Field, PasswordInput } from '@riff/core/domain/Field';
import { FIELD_CLASS } from '@riff/core/lib/fields';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
import { cn } from '@riff/core/lib/utils';
import { authErrorMessage } from '@riff/core/lib/authErrors';
import { safeRedirect } from '@riff/core/auth/redirect';
import { BRAND } from '@/brand';

type Role = 'professional' | 'student';

const ROLES: { value: Role; title: string; text: string; icon: typeof Ticket }[] = [
  { value: 'student', title: 'Quero participar', text: 'Reserve aulas, jogos e eventos', icon: Ticket },
  { value: 'professional', title: 'Quero organizar', text: 'Publique atividades e receba por Pix', icon: CalendarPlus },
];

const Signup = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { signUp } = useAuth();
  const [role, setRole] = useState<Role>(params.get('role') === 'professional' ? 'professional' : 'student');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signUp(email, password, fullName, role);
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
      title="Bora jogar junto"
      subtitle="Uma conta só para participar e organizar. Dá para trocar de modo quando quiser."
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
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Como você vai usar">
          {ROLES.map((r) => {
            const active = role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setRole(r.value)}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-all active:scale-[.98]',
                  active ? 'bg-brand/10 border-brand' : 'bg-surface border-line',
                )}
              >
                <span
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                    active ? 'bg-brand text-brand-ink' : 'bg-elevated text-ink-muted',
                  )}
                >
                  <r.icon className="w-5 h-5" strokeWidth={1.75} />
                </span>
                <span className="block text-sm font-semibold text-ink">{r.title}</span>
                <span className="block text-xs text-ink-muted mt-0.5">{r.text}</span>
              </button>
            );
          })}
        </div>

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
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : role === 'professional' ? 'Criar conta de organizador' : 'Criar conta'}
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
