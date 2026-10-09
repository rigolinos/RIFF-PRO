import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@riff/core/hooks/useAuth';
import { BrandLines } from '@riff/core/domain';
import { Logo } from '@riff/core/ui/logo';
import { Button } from '@riff/core/ui/button';
import { BRAND } from '@/brand';

// Tela de entrada do app: marca, frase e dois caminhos (cadastro tem os detalhes de cada papel)
const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Quem já entrou vai direto para as atividades
  if (!loading && user) return <Navigate to="/feed" replace />;

  return (
    <div className="relative min-h-[100dvh] bg-bg text-ink w-full max-w-[480px] mx-auto overflow-hidden flex flex-col">
      <BrandLines className="absolute inset-y-0 right-0 h-full w-3/4 opacity-70" />
      <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative flex-1 flex flex-col justify-center px-8 pt-safe"
      >
        <Logo variant="full-white" size="lg" className="justify-start" />
        <p className="type-label text-brand mt-8">{BRAND.name}</p>
        <h1 className="type-display mt-2">
          Organize. Participe.
          <br />
          <span className="text-brand">Jogue junto.</span>
        </h1>
        <p className="text-ink-muted mt-3 leading-relaxed">Aulas, jogos e eventos esportivos, direto com quem organiza.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
        className="relative px-8 pb-8 pb-safe space-y-3"
      >
        <Button size="lg" className="w-full h-14 shadow-[var(--shadow-cta)]" onClick={() => navigate('/signup')}>
          Criar conta
        </Button>
        <Button variant="secondary" size="lg" className="w-full h-14" onClick={() => navigate('/login')}>
          Já tenho conta
        </Button>
        <p className="pt-3 text-center text-xs text-ink-muted">
          <Link to="/termos" className="underline underline-offset-4">
            Termos de Uso
          </Link>
          {' · '}
          <Link to="/privacidade" className="underline underline-offset-4">
            Privacidade
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Landing;
