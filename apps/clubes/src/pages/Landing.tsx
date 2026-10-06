import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@riff/core/hooks/useAuth';
import { ArrowRight, Building2, CalendarDays, ShieldCheck, Users, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { Logo } from "@riff/core/ui/logo";
import { Button } from '@riff/core/ui/button';
import { BRAND } from '@/brand';

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Quem já entrou vai direto para o início
  if (!loading && user) return <Navigate to="/inicio" replace />;

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
            O esporte do seu condomínio,{' '}
            <span className="text-brand">organizado.</span>
          </h1>
          <p className="text-ink-muted text-base leading-relaxed max-w-xs mx-auto">
            Agenda, reservas e presença das atividades do seu condomínio ou clube, só para quem é da comunidade.
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
            className="w-full h-14 relative group"
            onClick={() => navigate('/signup')}
          >
            <KeyRound className="w-5 h-5 absolute left-6 opacity-80" />
            <span className="flex-1 text-center">Tenho um convite</span>
            <ArrowRight className="w-5 h-5 absolute right-6 opacity-80 group-hover:translate-x-1 transition-transform" />
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="w-full h-14 relative group"
            onClick={() => document.getElementById('gestores')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <Building2 className="w-5 h-5 absolute left-6 opacity-80" />
            <span className="flex-1 text-center">Sou síndico ou gestor</span>
            <ArrowRight className="w-5 h-5 absolute right-6 opacity-80 group-hover:translate-x-1 transition-transform" />
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
            { icon: KeyRound, text: 'Entre na comunidade do seu condomínio ou clube com o código de convite', color: 'text-brand' },
            { icon: CalendarDays, text: 'Veja a agenda e reserve aulas, jogos e eventos da sua comunidade', color: 'text-brand' },
            { icon: Users, text: 'Cadastre seus dependentes e acompanhe as atividades deles', color: 'text-brand' },
            { icon: ShieldCheck, text: 'Só membros veem as atividades e os locais da comunidade', color: 'text-success' },
          ].map((step, i) => (
            <div key={i} className="glass-card p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center ${step.color}`}>
                <step.icon className="w-5 h-5" />
              </div>
              <p className="text-ink text-sm font-medium flex-1">{step.text}</p>
            </div>
          ))}
        </div>

        <section id="gestores" className="mt-10 bg-surface border border-line rounded-2xl p-5">
          <h2 className="type-subtitle mb-2">Para síndicos e gestores</h2>
          <p className="text-sm text-ink-muted leading-relaxed">
            O {BRAND.name} organiza as atividades esportivas do seu condomínio ou clube: agenda, inscrições, presença e
            instrutores, num espaço fechado para os seus moradores e sócios.
          </p>
          {BRAND.salesContactUrl ? (
            <Button className="w-full mt-4" onClick={() => window.open(BRAND.salesContactUrl, '_blank')}>
              Quero o {BRAND.name} aqui
            </Button>
          ) : (
            <p className="text-sm text-ink mt-4 font-medium">Fale com a equipe Riff para levar o {BRAND.name} até você.</p>
          )}
        </section>
      </motion.div>
    </div>
  );
};

export default Landing;
