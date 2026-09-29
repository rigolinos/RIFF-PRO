import { useState } from 'react';

import { useNavigate, useSearchParams, Link } from 'react-router-dom';

import { Eye, EyeOff, Dumbbell, ArrowLeft } from 'lucide-react';

import { motion } from 'framer-motion';

import { useAuth } from '@/hooks/useAuth';

import { toast } from 'sonner';



const Login = () => {

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const { signIn } = useAuth();



  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);



  // Show confirmation message if coming from signup

  const justRegistered = searchParams.get('registered') === 'true';

  const justConfirmed = searchParams.get('confirmed') === 'true';



  const handleLogin = async (e: React.FormEvent) => {

    e.preventDefault();

    setIsLoading(true);



    const { error } = await signIn(email, password);



    if (error) {

      toast.error(error.message || 'Email ou senha incorretos');

      setIsLoading(false);

      return;

    }



    toast.success('Bem-vindo de volta! ðŸ‹ï¸');

    const redirect = searchParams.get('redirect');

    navigate(redirect ? redirect : '/feed');

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

          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">

            <Dumbbell className="w-5 h-5 text-black" />

          </div>

          <span className="text-lg font-bold text-foreground">Riff <span className="text-emerald-400">Pro</span></span>

        </div>

        <h1 className="text-2xl font-bold text-foreground">Entrar</h1>

        <p className="text-muted-foreground text-sm mt-1">Acesse sua conta Riff Pro</p>

      </motion.div>



      {/* Status Messages */}

      {justRegistered && (

        <motion.div

          initial={{ opacity: 0, y: -10 }}

          animate={{ opacity: 1, y: 0 }}

          className="mb-6 p-4 glass-card border-emerald-500/30 text-emerald-400 text-sm"

        >

          âœ… Conta criada! Verifique seu email para confirmar e depois entre aqui.

        </motion.div>

      )}



      {justConfirmed && (

        <motion.div

          initial={{ opacity: 0, y: -10 }}

          animate={{ opacity: 1, y: 0 }}

          className="mb-6 p-4 glass-card border-emerald-500/30 text-emerald-400 text-sm"

        >

          âœ… Email confirmado! Agora você pode entrar.

        </motion.div>

      )}



      {/* Form */}

      <motion.form

        initial={{ opacity: 0, y: 10 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ delay: 0.1 }}

        onSubmit={handleLogin}

        className="flex-1 flex flex-col gap-4"

      >

        <div>

          <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>

          <input

            type="email"

            placeholder="seu@email.com"

            value={email}

            onChange={e => setEmail(e.target.value)}

            required

            autoComplete="email"

            className="w-full h-12 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 transition-colors"

          />

        </div>



        <div>

          <label className="text-sm text-muted-foreground mb-1.5 block">Senha</label>

          <div className="relative">

            <input

              type={showPassword ? 'text' : 'password'}

              placeholder="Sua senha"

              value={password}

              onChange={e => setPassword(e.target.value)}

              required

              autoComplete="current-password"

              className="w-full h-12 rounded-xl bg-white/[0.05] border border-white/10 px-4 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 transition-colors"

            />

            <button

              type="button"

              onClick={() => setShowPassword(!showPassword)}

              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"

            >

              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}

                        </button>

          </div>

          <div className="flex justify-end mt-2">

            <Link to="/forgot-password" className="text-sm font-medium text-emerald-400 hover:text-emerald-300">

              Esqueci minha senha

            </Link>

          </div>

        </div>



        <button

          type="submit"

          disabled={isLoading}

          className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-4 glow-emerald"

        >

          {isLoading ? (

            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />

          ) : (

            <>Entrar</>

          )}

        </button>

      </motion.form>



      {/* Footer */}

      <p className="text-center text-muted-foreground text-sm mt-6">

        Não tem conta?{' '}

        <Link to={searchParams.toString() ? `/signup?${searchParams.toString()}` : '/signup'} className="text-emerald-400 font-medium hover:text-emerald-300">

          Criar conta

        </Link>

      </p>

    </div>

  );

};



export default Login;

