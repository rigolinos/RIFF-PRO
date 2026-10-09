import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@riff/core/supabase/client';
import { AuthShell } from '@riff/core/layout/AuthShell';
import { Field, PasswordInput } from '@riff/core/domain/Field';
import { Button } from '@riff/core/ui/button';
import { authErrorMessage } from '@riff/core/lib/authErrors';
import { PASSWORD_HINT, PASSWORD_MIN, passwordProblem } from '@riff/core/lib/password';

/** Nova senha, aberta pelo link do e-mail de recuperação (igual nos dois apps). */
export function ResetPasswordScreen({ product }: { product: string }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sem a sessão de recuperação (link inválido ou vencido), volta para o login
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && !window.location.hash.includes('access_token')) {
        toast.error('Link de recuperação inválido ou vencido. Peça um novo.');
        navigate('/forgot-password', { replace: true });
      }
    });
  }, [navigate]);

  const mismatch = confirm.length > 0 && confirm !== password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) return toast.error(`Nova senha: ${problem.toLowerCase()}.`);
    if (password !== confirm) return toast.error('As senhas não são iguais.');
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      toast.error(authErrorMessage(error, 'Não foi possível salvar a nova senha.'));
      return;
    }
    toast.success('Senha atualizada. Entre com a nova senha.');
    navigate('/login', { replace: true });
  };

  return (
    <AuthShell product={product} label="Senha" title="Crie uma nova senha" subtitle="Use pelo menos 8 caracteres, com letras e números. Depois é só entrar com ela.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nova senha" htmlFor="reset-password" hint={password ? (passwordProblem(password) ?? undefined) : PASSWORD_HINT}>
          <PasswordInput
            id="reset-password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={PASSWORD_MIN}
          />
        </Field>
        <Field label="Repita a nova senha" htmlFor="reset-confirm" error={mismatch ? 'As senhas não são iguais.' : undefined}>
          <PasswordInput
            id="reset-confirm"
            autoComplete="new-password"
            placeholder="A mesma senha"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={PASSWORD_MIN}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full mt-2" disabled={isLoading || !password || !confirm || mismatch}>
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar nova senha'}
        </Button>
      </form>
    </AuthShell>
  );
}
