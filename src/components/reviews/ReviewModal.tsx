import { useState } from 'react';
import { Star, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';

interface ReviewModalProps {
  booking: {
    id: string;
    session_id: string;
    professional_id: string;
    professional?: { full_name?: string };
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewModal({ booking, isOpen, onClose, onSuccess }: ReviewModalProps) {
  const { profile } = useProfile();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!booking) return null;

  const handleSubmit = async () => {
    if (!profile) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('reviews').insert({
        professional_id: booking.professional_id,
        reviewer_id: profile.id,
        session_id: booking.session_id,
        booking_id: booking.id,
        rating,
        comment: comment.trim() || null
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('Você já avaliou esta aula.');
        } else if (error.message?.includes('new row violates row-level security')) {
          toast.error('Você só pode avaliar aulas concluídas que participou.');
        } else {
          throw error;
        }
      } else {
        // DO NOT update booking status here.
        // The "completed" status is set by the professional via close_session RPC.
        // The rating trigger will auto-recalculate the pro's rating_avg.
        toast.success('Avaliação enviada! Obrigado pelo feedback.');
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar avaliação.');
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[90vw] max-w-md rounded-3xl bg-background border border-white/10 p-6">
        <DialogHeader className="text-left mb-2">
          <DialogTitle className="text-xl font-bold">Avaliar Aula</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Como foi a sua experiência com {booking.professional?.full_name}?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-6 gap-6">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition-transform active:scale-90 p-1"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= rating
                      ? 'fill-emerald-400 text-emerald-400'
                      : 'fill-white/5 text-white/10 hover:text-white/20'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="w-full space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              Comentário (Opcional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte o que achou da aula..."
              className="bg-white/[0.02] border-white/10 resize-none h-24"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold glow-emerald"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Avaliação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
