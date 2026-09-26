import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, MapPin, DollarSign, Star, Users, Dumbbell } from 'lucide-react';
import { motion } from 'framer-motion';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center glow-emerald">
              <Dumbbell className="w-6 h-6 text-black" />
            </div>
            <span className="text-2xl font-bold text-foreground">
              Riff <span className="text-emerald-400">Pro</span>
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl font-bold text-foreground leading-tight mb-4">
            Sua carreira esportiva{' '}
            <span className="text-gradient-emerald">sem intermediários.</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-xs mx-auto">
            Crie suas turmas, defina seu preço e receba alunos em um só lugar. Sem academia, sem matrícula.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-full space-y-3 mb-10"
        >
          <button
            onClick={() => navigate('/signup?role=professional')}
            className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] glow-emerald-strong"
          >
            <Shield className="w-5 h-5" />
            Sou Profissional
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => navigate('/signup?role=student')}
            className="w-full h-14 glass-surface rounded-2xl flex items-center justify-center gap-2 text-foreground font-medium hover:bg-white/[0.08] transition-all active:scale-[0.98]"
          >
            <Users className="w-5 h-5" />
            Quero Treinar
          </button>
        </motion.div>

        {/* Login Link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-muted-foreground text-sm"
        >
          Já tem conta?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors"
          >
            Entrar
          </button>
        </motion.p>
      </div>

      {/* How it Works */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="px-6 pb-10"
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">
          Como funciona
        </h2>
        <div className="space-y-3">
          {[
            { icon: Shield, text: 'Crie seu perfil verificado (CREF, CREFITO)', color: 'text-emerald-400' },
            { icon: MapPin, text: 'Publique aulas em parques, praias ou estúdios', color: 'text-blue-400' },
            { icon: DollarSign, text: 'Receba pagamento direto dos alunos', color: 'text-amber-400' },
            { icon: Star, text: 'Construa sua reputação com avaliações', color: 'text-purple-400' },
          ].map((step, i) => (
            <div key={i} className="glass-card p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center ${step.color}`}>
                <step.icon className="w-5 h-5" />
              </div>
              <p className="text-foreground text-sm font-medium flex-1">{step.text}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Landing;
