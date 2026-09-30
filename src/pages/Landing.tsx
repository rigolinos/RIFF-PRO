import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, MapPin, DollarSign, Star, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Logo } from "@/components/ui/logo";
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
          <Logo variant="full-color" size="xl" className="justify-start" />
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-10"
        >
          <h1 className="type-display mb-4">
            Sua carreira esportiva{' '}
            <span className="text-brand">sem intermediários.</span>
          </h1>
          <p className="text-ink-muted text-base leading-relaxed max-w-xs mx-auto">
            Crie suas atividades, defina seu preço e receba participantes em um só lugar. Simples e direto.
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
            Sou Organizador
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="w-full h-14"
            onClick={() => navigate('/signup?role=student')}
          >
            <Users className="w-5 h-5 mr-2" />
            Explorar Atividades
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
        <h2 className="type-subtitle mb-4 text-center">
          Como funciona
        </h2>
        <div className="space-y-3">
          {[
            { icon: Shield, text: 'Crie sua vitrine organizador e atraia participantes', color: 'text-brand' },
            { icon: MapPin, text: 'Publique atividades em parques, praias ou estúdios', color: 'text-brand' },
            { icon: DollarSign, text: 'Receba o pagamento direto dos seus participantes', color: 'text-accent' },
            { icon: Star, text: 'Construa sua reputação com avaliações reais', color: 'text-slate' },
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
