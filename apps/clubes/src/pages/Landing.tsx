import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, CalendarDays, KeyRound, ShieldCheck, Trophy, Users } from 'lucide-react';
import { useAuth } from '@riff/core/hooks/useAuth';
import { ProductMark } from '@riff/core/layout/AuthShell';
import { BrandLines } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { BRAND } from '@/brand';

const STEPS = [
  { icon: KeyRound, title: 'Entre com o convite', text: 'O código do seu condomínio ou clube abre a comunidade.' },
  { icon: CalendarDays, title: 'Veja a agenda', text: 'Aulas, jogos e eventos da comunidade. Inscreva-se num toque.' },
  { icon: Trophy, title: 'Jogue e evolua', text: 'Elogios depois do jogo, conquistas e o ranking do mês.' },
  { icon: Users, title: 'Inclua a família', text: 'Cadastre dependentes e acompanhe as atividades deles.' },
];

const fadeUp = (delay = 0) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay } });

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Quem já entrou vai direto para o início
  if (!loading && user) return <Navigate to="/inicio" replace />;

  return (
    <div className="min-h-[100dvh] bg-bg text-ink w-full max-w-[480px] mx-auto overflow-x-hidden">
      <section className="relative overflow-hidden bg-surface border-b border-line pb-10">
        <BrandLines className="absolute inset-y-0 right-0 h-full w-3/4" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
        <div className="relative px-6 pt-safe">
          <div className="h-16 flex items-center justify-between">
            <ProductMark product={BRAND.name} />
            <Link to="/login" className="h-9 px-4 rounded-full bg-bg/50 backdrop-blur-sm text-sm font-semibold text-ink flex items-center active:scale-95">
              Entrar
            </Link>
          </div>
          <motion.div {...fadeUp()} className="pt-8">
            <p className="type-label">{BRAND.family}</p>
            <h1 className="type-display mt-2">
              O esporte do seu condomínio, <span className="text-brand">organizado.</span>
            </h1>
            <p className="text-ink-muted mt-3 leading-relaxed max-w-sm">
              Agenda, inscrições e presença das atividades do seu condomínio ou clube, só para quem é da comunidade.
            </p>
          </motion.div>
          <motion.div {...fadeUp(0.15)} className="pt-6 space-y-3">
            <Button size="lg" className="w-full h-14 justify-between px-5 shadow-[var(--shadow-cta)]" onClick={() => navigate('/signup')}>
              <span className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" /> Tenho um convite
              </span>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="w-full h-14 justify-between px-5"
              onClick={() => document.getElementById('gestores')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <span className="flex items-center gap-2">
                <Building2 className="w-5 h-5" /> Sou síndico ou gestor
              </span>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      <section className="px-6 pt-10 space-y-3">
        <p className="type-label">Como funciona</p>
        <h2 className="type-title">A comunidade jogando junto</h2>
        <ol className="space-y-2 pt-1">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-start gap-3 bg-surface border border-line rounded-2xl p-4">
              <span className="relative w-10 h-10 rounded-xl bg-brand/15 text-brand flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5" strokeWidth={1.75} />
                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-brand text-brand-ink text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{s.title}</span>
                <span className="block text-xs text-ink-muted mt-0.5 leading-relaxed">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="flex items-center gap-2 text-xs text-ink-muted px-1 pt-1">
          <ShieldCheck className="w-4 h-4 text-success shrink-0" /> Só membros veem as atividades e os locais da comunidade.
        </p>
      </section>

      <section id="gestores" className="px-4 pt-10 scroll-mt-6">
        <div className="relative overflow-hidden bg-surface border border-brand/40 rounded-2xl p-5">
          <BrandLines className="absolute inset-y-0 right-0 h-full w-1/2" />
          <div className="relative space-y-3">
            <Building2 className="w-8 h-8 text-brand" strokeWidth={1.75} />
            <h2 className="type-subtitle">Para síndicos e gestores</h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              O {BRAND.name} organiza as atividades esportivas do seu condomínio ou clube: agenda, inscrições, presença e instrutores, num
              espaço fechado para os seus moradores e sócios.
            </p>
            <Button className="w-full" onClick={() => navigate('/signup?redirect=/cadastrar-comunidade')}>
              Cadastrar meu condomínio ou clube
            </Button>
            <p className="text-xs text-ink-muted">Leva 2 minutos. A equipe Riff confirma com o responsável e cria a comunidade.</p>
          </div>
        </div>
      </section>

      <footer className="px-6 pt-10 pb-10 text-center space-y-3">
        <p className="text-sm text-ink-muted">
          Já tem conta?{' '}
          <Link to="/login" className="text-brand font-semibold underline underline-offset-4">
            Entrar
          </Link>
        </p>
        <p className="text-xs text-ink-muted">
          <Link to="/termos" className="underline underline-offset-4">
            Termos de Uso
          </Link>
          {' · '}
          <Link to="/privacidade" className="underline underline-offset-4">
            Privacidade
          </Link>
          {' · '}
          {BRAND.name} é parte da {BRAND.family}
        </p>
      </footer>
    </div>
  );
};

export default Landing;
