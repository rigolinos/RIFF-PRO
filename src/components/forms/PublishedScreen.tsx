import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CalendarPlus, CheckCircle2, Eye, Link2, MessageCircle } from 'lucide-react';
import { BrandLines } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { activityInvite, shareActivity } from '@/lib/share';

type Published = { id: string; title: string; date: string; start_time: string; location_name: string | null };

/** Depois de publicar: o próximo passo é chamar a galera */
export function PublishedScreen({ session, onView, onDone, onCreateAnother }: { session: Published; onView: () => void; onDone: () => void; onCreateAnother: () => void }) {
  const url = `${window.location.origin}/session/${session.id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${activityInvite(session, { isOwner: true })} ${url}`);
      toast.success('Convite copiado. Cole no WhatsApp, no Instagram ou onde quiser.');
    } catch {
      toast.error('Não foi possível copiar. Use o botão de compartilhar.');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-bg text-ink w-full max-w-[480px] mx-auto overflow-x-hidden flex flex-col">
      <section className="relative overflow-hidden bg-surface border-b border-line px-6 pt-safe pb-10">
        <BrandLines className="absolute inset-y-0 right-0 h-full w-3/4" />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative pt-16 space-y-3">
          <span className="w-14 h-14 rounded-2xl bg-success/15 text-success flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </span>
          <p className="type-label text-success">Atividade no ar</p>
          <h1 className="type-display">Agora chame a galera</h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            <span className="text-ink font-semibold">{session.title}</span>
            {' · '}
            <span className="first-letter:uppercase">{format(parseISO(session.date), "EEEE, d 'de' MMM", { locale: ptBR })}</span> às{' '}
            {session.start_time.slice(0, 5)}. Quem receber o convite vê a atividade e reserva direto.
          </p>
        </motion.div>
      </section>

      <div className="flex-1 px-6 py-6 space-y-3">
        <Button size="lg" className="w-full shadow-[var(--shadow-cta)]" onClick={() => void shareActivity(session, { isOwner: true })}>
          <MessageCircle className="w-5 h-5 mr-2" /> Mandar o convite
        </Button>
        <Button size="lg" variant="secondary" className="w-full" onClick={() => void copyLink()}>
          <Link2 className="w-5 h-5 mr-2" /> Copiar convite com o link
        </Button>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="secondary" onClick={onView}>
            <Eye className="w-4 h-4 mr-2" /> Ver atividade
          </Button>
          <Button variant="secondary" onClick={onCreateAnother}>
            <CalendarPlus className="w-4 h-4 mr-2" /> Criar outra
          </Button>
        </div>
        <button type="button" onClick={onDone} className="w-full h-12 text-sm font-semibold text-ink-muted">
          Ir para minhas atividades
        </button>
      </div>
    </div>
  );
}
