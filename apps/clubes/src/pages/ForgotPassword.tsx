import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';
import { Logo } from '@riff/core/ui/logo';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import * as z from 'zod';

import { supabase } from '@riff/core/supabase/client';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      forgotPasswordSchema.parse({ email });
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error('Erro ao validar email.');
      }
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsLoading(false);

    if (error) {
      if (error.status === 429) {
        toast.error('Aguarde alguns segundos antes de tentar novamente.');
      } else {
        toast.error(error.message || 'Erro ao enviar email.');
      }
      return;
    }

    setIsSuccess(true);
    toast.success('Email de recuperação enviado com sucesso!');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-8">
      <div className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Logo variant="icon" size="md" />
          <span className="text-lg font-bold text-foreground">Riff <span className="text-brand">Clubes</span></span>
        </div>
        <h1 className="type-display">Recuperar Senha</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Informe seu email para receber o link de redefinição.
        </p>
      </motion.div>

      {isSuccess ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center mt-8">
          <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-4 text-brand">
            <Mail className="w-8 h-8" />
          </div>
          <h3 className="type-title mb-2">Verifique sua caixa de entrada</h3>
          <p className="text-muted-foreground text-sm mb-8">
            Enviamos um link seguro para <strong>{email}</strong>. Lembre-se de checar a caixa de spam.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full h-12 bg-brand hover:brightness-105 text-brand-ink font-semibold rounded-xl glow-brand transition-all"
          >
            Voltar ao Login
          </button>
        </motion.div>
      ) : (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col gap-6"
        >
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Email da conta</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full h-12 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full h-12 bg-brand hover:brightness-105 disabled:opacity-50 text-brand-ink font-semibold rounded-xl flex items-center justify-center gap-2 transition-all glow-brand"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Link de Recuperação'}
          </button>
        </motion.form>
      )}
    </div>
  );
};

export default ForgotPassword;
