import { useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Loader2, Users } from 'lucide-react';
import { useAuth } from '@riff/core/hooks/useAuth';
import { AuthShell } from '@riff/core/layout/AuthShell';
import { Button } from '@riff/core/ui/button';
import { BRAND } from '@/brand';
import { isInviteCode, normalizeInviteCode, storeInviteCode } from '@/lib/invite';

/**
 * Link de convite do gestor (/convite/XXXX-XXXX). Guarda o código e leva a pessoa a criar a
 * conta ou entrar; no Início, ela entra sozinha no grupo.
 */
export default function InviteLanding() {
  const { codigo = '' } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const valid = isInviteCode(codigo);
  const code = normalizeInviteCode(codigo);

  useEffect(() => {
    if (valid) storeInviteCode(code);
  }, [valid, code]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }
  // já tem conta aberta neste aparelho: o Início usa o convite
  if (user && valid) return <Navigate to="/inicio" replace />;

  return (
    <AuthShell
      product={BRAND.name}
      label="Convite"
      title={valid ? 'Você foi convidado para um grupo' : 'Convite inválido'}
      subtitle={
        valid
          ? 'Crie sua conta (ou entre, se já usa o Riff). Depois de confirmar o e-mail, você entra direto no grupo do seu condomínio ou clube.'
          : 'O link não tem um código de convite válido. Peça um novo ao gestor do seu condomínio ou clube.'
      }
    >
      <div className="flex-1">
        {valid && (
          <div className="bg-surface border border-line rounded-2xl p-5 flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-brand/15 text-brand flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs text-ink-muted">Código do convite</p>
              <p className="text-lg font-semibold tracking-[0.2em] text-ink">{code}</p>
            </div>
          </div>
        )}
      </div>
      <div className="pt-6 space-y-2">
        {valid ? (
          <>
            <Button size="lg" className="w-full" onClick={() => navigate('/signup')}>
              Criar conta
            </Button>
            <Button size="lg" variant="secondary" className="w-full" onClick={() => navigate('/login')}>
              Já tenho conta
            </Button>
          </>
        ) : (
          <Button size="lg" variant="secondary" className="w-full" onClick={() => navigate('/')}>
            Ir para o início
          </Button>
        )}
      </div>
    </AuthShell>
  );
}
