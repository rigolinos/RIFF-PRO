import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Users, Shield } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get('role') as 'professional' | 'student') || 'student';

  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'professional' | 'student'>(initialRole);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signUp(email, password, fullName, role);

    if (error) {
      toast.error(error.message || 'Erro ao criar conta');
      setIsLoading(false);
      return;
    }

    toast.success('Conta criada! Verifique seu email para confirmar.');
    const redirect = searchParams.get('redirect');
    navigate('/login?registered=true' + (redirect ? '&redirect=' + redirect : ''));
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-8">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Logo & Title */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-3">
          <Logo variant="icon" size="md" />
          <span className="text-lg font-bold text-foreground">Riff <span className="text-brand">Pro</span></span>
        </div>
        <h1 className="type-display">Criar conta</h1>
        <p className="text-muted-foreground text-sm mt-1">Comece a sua jornada sem intermediários</p>
      </motion.div>

      {/* Role Selector */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3 mb-6"
      >
        <button
          type="button"
          onClick={() => setRole('professional')}
          className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
            role === 'professional'
              ? 'border-brand bg-brand/10 text-brand'
              : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20'
          }`}
        >
          <Shield className="w-6 h-6" />
          <span className="text-sm font-medium">Organizador</span>
        </button>
        <button
          type="button"
          onClick={() => setRole('student')}
          className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
            role === 'student'
              ? 'border-brand bg-brand/10 text-brand'
              : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20'
          }`}
        >
          <Users className="w-6 h-6" />
          <span className="text-sm font-medium">Participante</span>
        </button>
      </motion.div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSignup}
        className="flex-1 flex flex-col gap-4"
      >
        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Nome completo</label>
          <input
            type="text"
            placeholder="Seu nome"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            className="w-full h-12 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full h-12 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Senha</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-brand hover:brightness-105 disabled:opacity-50 text-brand-ink font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-4 glow-emerald"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <>Criar conta</>
          )}
        </button>
      </motion.form>

      {/* Footer */}
      <p className="text-center text-muted-foreground text-sm mt-6">
        Já tem conta?{' '}
        <Link to="/login" className="text-brand font-medium hover:text-brand">
          Entrar
        </Link>
      </p>
    </div>
  );
};

export default Signup;

