import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarPlus, ClipboardCheck, Link2, MapPin, QrCode, Search, Star, Ticket, Wallet } from 'lucide-react';
import { useAuth } from '@riff/core/hooks/useAuth';
import { ProductMark } from '@riff/core/layout/AuthShell';
import { BrandLines, SportIcon, SpotsMeter } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { BRAND } from '@/brand';

const ORGANIZE = [
  { icon: Link2, title: 'Sua vitrine no link da bio', text: 'Um endereço seu, com as próximas atividades e as avaliações.' },
  { icon: CalendarPlus, title: 'Publique em um minuto', text: 'Aula, jogo, campeonato ou evento: dia, local, vagas e preço.' },
  { icon: Wallet, title: 'Receba por Pix, direto', text: 'Quem reserva vê o QR com o valor certo. O dinheiro vai para você.' },
  { icon: ClipboardCheck, title: 'Presença e avaliações', text: 'Lista de inscritos, check-in e a reputação crescendo a cada atividade.' },
];

const PARTICIPATE = [
  { icon: Search, text: 'Encontre o que está rolando na sua cidade' },
  { icon: Ticket, text: 'Garanta a vaga em segundos e pague por Pix' },
  { icon: Star, text: 'Avalie depois e acompanhe seu perfil esportista' },
];

const fadeUp = (delay = 0) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay } });

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Quem já entrou vai direto para as atividades
  if (!loading && user) return <Navigate to="/feed" replace />;

  return (
    <div className="min-h-[100dvh] bg-bg text-ink w-full max-w-[480px] mx-auto overflow-x-hidden">
      {/* Cabeçalho */}
      <section className="relative overflow-hidden bg-surface border-b border-line pb-24">
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
              Organize. Participe.
              <br />
              <span className="text-brand">Jogue junto.</span>
            </h1>
            <p className="text-ink-muted mt-3 leading-relaxed max-w-sm">
              Aulas, jogos, campeonatos e eventos num lugar só. Quem organiza publica e recebe por Pix; quem participa reserva em segundos.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Ingresso de exemplo */}
      <motion.div {...fadeUp(0.15)} className="relative z-10 -mt-16 mx-4" aria-label="Exemplo de atividade">
        <div className="bg-elevated border border-line rounded-2xl shadow-[var(--shadow-2)] overflow-hidden">
          <div className="flex items-stretch">
            <div className="w-20 shrink-0 flex flex-col items-center justify-center border-r border-dashed border-line py-4">
              <span className="type-label">Sáb</span>
              <span className="type-title leading-tight">07:00</span>
            </div>
            <div className="flex-1 min-w-0 p-4 space-y-1.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <SportIcon slug="volei-praia" className="w-4 h-4 text-brand shrink-0" />
                <span className="truncate">Vôlei de praia para todos</span>
              </p>
              <p className="flex items-center gap-1 text-xs text-ink-muted">
                <MapPin className="w-3.5 h-3.5 shrink-0" /> Jogo · Orla do Guaíba
              </p>
              <SpotsMeter current={9} max={12} />
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-muted">3 vagas</span>
                <span className="font-display font-bold text-sm text-accent">R$ 30</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-ink-muted mt-2">Exemplo de como sua atividade aparece</p>
      </motion.div>

      {/* Chamadas */}
      <motion.div {...fadeUp(0.25)} className="px-6 pt-6 space-y-3">
        <Button size="lg" className="w-full h-14 justify-between px-5 shadow-[var(--shadow-cta)]" onClick={() => navigate('/signup?role=professional')}>
          <span className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5" /> Quero organizar
          </span>
          <ArrowRight className="w-5 h-5" />
        </Button>
        <Button variant="secondary" size="lg" className="w-full h-14 justify-between px-5" onClick={() => navigate('/signup?role=student')}>
          <span className="flex items-center gap-2">
            <Ticket className="w-5 h-5" /> Quero participar
          </span>
          <ArrowRight className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Para quem organiza */}
      <section className="px-6 pt-10 space-y-3">
        <p className="type-label">Para quem organiza</p>
        <h2 className="type-title">Venda suas atividades sem depender de ninguém</h2>
        <ol className="space-y-2 pt-1">
          {ORGANIZE.map((s, i) => (
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
      </section>

      {/* Para quem participa */}
      <section className="px-6 pt-10 space-y-3">
        <p className="type-label">Para quem participa</p>
        <h2 className="type-title">Achou, reservou, jogou</h2>
        <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
          {PARTICIPATE.map((s) => (
            <li key={s.text} className="flex items-center gap-3 px-4 py-3">
              <s.icon className="w-5 h-5 text-brand shrink-0" strokeWidth={1.75} />
              <span className="text-sm text-ink">{s.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Fechamento */}
      <section className="px-4 pt-10">
        <div className="relative overflow-hidden bg-surface border border-brand/40 rounded-2xl p-5">
          <BrandLines className="absolute inset-y-0 right-0 h-full w-1/2" />
          <div className="relative space-y-3">
            <QrCode className="w-8 h-8 text-brand" strokeWidth={1.75} />
            <h2 className="type-subtitle">Seu link na bio pronto hoje</h2>
            <p className="text-sm text-ink-muted leading-relaxed max-w-[16rem]">Crie a conta, publique a primeira atividade e mande o link para a sua turma.</p>
            <Button className="w-full" onClick={() => navigate('/signup?role=professional')}>
              Criar minha vitrine
            </Button>
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
