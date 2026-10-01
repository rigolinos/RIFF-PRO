import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if there is an active session or a recovery token in the URL hash
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If no session and no hash parameters (access_token), user shouldn't be here
      if (!session && !window.location.hash.includes('access_token')) {
        toast.error('Link de recuperação inválido ou expirado.');
        navigate('/login');
      }
    };
    
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);

    // Update the password using the established recovery session
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    setIsLoading(false);

    if (error) {
      toast.error(error.message || 'Erro ao redefinir a senha.');
      return;
    }

    toast.success('Senha atualizada com sucesso!');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 mt-12">
        <div className="flex items-center gap-2 mb-3">
          <Logo variant="icon" size="md" />
          <span className="text-lg font-bold text-foreground">Riff <span className="text-brand">Pro</span></span>
        </div>
        <h1 className="type-display">Definir Nova Senha</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Crie uma nova senha segura para acessar sua conta.
        </p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-4"
      >
        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Nova Senha</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-12 rounded-xl bg-white/[0.05] border border-white/10 px-4 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Confirmar Nova Senha</label>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Repita a nova senha"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full h-12 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !password || !confirmPassword}
          className="w-full h-12 mt-4 bg-brand hover:brightness-105 disabled:opacity-50 text-brand-ink font-semibold rounded-xl flex items-center justify-center gap-2 transition-all glow-emerald"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Nova Senha'}
        </button>
      </motion.form>
    </div>
  );
};

export default ResetPassword;
