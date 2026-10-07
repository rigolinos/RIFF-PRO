import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

type ActivityLike = {
  id: string;
  title: string;
  date: string;
  start_time: string;
  location_name?: string | null;
};

/** Mensagem do convite: quem organiza convida; quem participa chama os amigos */
export function activityInvite(a: ActivityLike, opts: { isOwner: boolean; organizerFirstName?: string | null }) {
  const parts = [
    format(parseISO(a.date), "EEEE, d 'de' MMMM", { locale: ptBR }),
    `às ${a.start_time.substring(0, 5)}`,
    a.location_name,
  ].filter(Boolean);
  const joined = parts.join(', ');
  const details = `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
  return opts.isOwner
    ? `Estou organizando "${a.title}" pela Riff Sports. ${details} Quer participar?`
    : `"${a.title}"${opts.organizerFirstName ? `, com ${opts.organizerFirstName},` : ''} pela Riff Sports. ${details} Quer participar?`;
}

/** Abre o compartilhar do celular com a mensagem e o link; sem ele, copia os dois */
export async function shareActivity(a: ActivityLike, opts: { isOwner: boolean; organizerFirstName?: string | null }) {
  const url = `${window.location.origin}/session/${a.id}`;
  const text = activityInvite(a, opts);
  if (navigator.share) {
    try {
      await navigator.share({ title: a.title, text, url });
    } catch {
      // a pessoa fechou a janela de compartilhar
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast.success('Convite copiado. Cole no WhatsApp ou na bio.');
  } catch {
    toast.error('Não foi possível copiar o convite.');
  }
}
