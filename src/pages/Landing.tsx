import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, MapPin, DollarSign, Star, Users, Dumbbell } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg flex flex-col">
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
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center glow-emerald">
              <Dumbbell className="w-6 h-6 text-brand-ink" />
            </div>
            <span className="text-2xl font-bold text-ink">
              Riff <span className="text-brand">Pro</span>
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
          <h1 className="text-3xl font-bold font-display text-ink leading-tight mb-4">
            Sua carreira esportiva{' '}
            <span className="text-brand">sem intermediários.</span>
          </h1>
          <p className="text-ink-muted text-base leading-relaxed max-w-xs mx-auto">
            Crie suas turmas, defina seu preço e receba alunos em um só lugar. Sem academia, sem matrícula.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-full space-y-3 mb-10 flex flex-col"
        >
          <Button
            size="lg"
            className="w-full h-14"
            onClick={() => navigate('/signup?role=professional')}
          >
            <Shield className="w-5 h-5 mr-2" />
            Sou Profissional
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="w-full h-14"
            onClick={() => navigate('/signup?role=student')}
          >
            <Users className="w-5 h-5 mr-2" />
            Quero Treinar
          </Button>
        </motion.div>

        {/* Login Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-ink-muted text-sm text-center"
        >
          Já tem conta?{' '}
          <Button
            variant="link"
            className="px-1 h-auto"
            onClick={() => navigate('/login')}
          >
            Entrar
          </Button>
        </motion.div>
      </div>

      {/* How it Works */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="px-6 pb-10"
      >
        <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-4 text-center">
          Como funciona
        </h2>
        <div className="space-y-3">
          {[
            { icon: Shield, text: 'Crie sua vitrine profissional e atraia alunos', color: 'text-brand' },
            { icon: MapPin, text: 'Publique aulas em parques, praias ou estúdios', color: 'text-blue-400' },
            { icon: DollarSign, text: 'Receba o pagamento direto dos seus alunos', color: 'text-amber-400' },
            { icon: Star, text: 'Construa sua reputação com avaliações reais', color: 'text-purple-400' },
          ].map((step, i) => (
            <div key={i} className="glass-card p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center ${step.color}`}>
                <step.icon className="w-5 h-5" />
              </div>
              <p className="text-ink text-sm font-medium flex-1">{step.text}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Landing;
