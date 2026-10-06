import { Clock, Heart, MapPin, Smile, Sparkles, Wallet, type LucideIcon } from 'lucide-react';

/** Destaques que o participante marca ao avaliar o organizador (gravados em reviews.tags) */
export const ORGANIZER_TAGS: { tag: string; label: string; icon: LucideIcon }[] = [
  { tag: 'pontual', label: 'Pontual', icon: Clock },
  { tag: 'organizado', label: 'Bem organizado', icon: Sparkles },
  { tag: 'didatico', label: 'Explica bem', icon: Smile },
  { tag: 'energia', label: 'Boa energia', icon: Heart },
  { tag: 'local', label: 'Ótimo local', icon: MapPin },
  { tag: 'vale', label: 'Vale o preço', icon: Wallet },
];

export const RATING_LABELS = ['', 'Ruim', 'Fraco', 'Ok', 'Muito bom', 'Excelente'];

type ReviewableBooking = {
  status: string | null;
  payment_status: string | null;
  attendance_status?: string | null;
  review?: unknown;
  session: { date: string; start_time: string; duration_minutes: number | null; status?: string | null };
};

const reviewed = (r: unknown) => (Array.isArray(r) ? r.length > 0 : !!r);

/** Fim da atividade (horário do aparelho) */
export const sessionEnd = (s: ReviewableBooking['session']) =>
  new Date(new Date(`${s.date}T${s.start_time}`).getTime() + (s.duration_minutes ?? 60) * 60_000);

/** Mesma regra do banco (política student_create_review_verified, migration 20261027000016) */
export function canReview(b: ReviewableBooking, now: number) {
  if (reviewed(b.review) || b.session.status === 'cancelled') return false;
  if (sessionEnd(b.session).getTime() > now) return false;
  if (b.status === 'completed') return true;
  return (
    b.status === 'confirmed' &&
    (b.payment_status === 'paid' || b.payment_status === 'free') &&
    !['absent', 'excused'].includes(b.attendance_status ?? 'present')
  );
}
