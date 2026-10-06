import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Loader2, QrCode, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@riff/core/hooks/useProfile';
import { AuthShell } from '@riff/core/layout/AuthShell';
import { Field } from '@riff/core/domain/Field';
import { FIELD_CLASS } from '@riff/core/lib/fields';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
import { errorMessage } from '@riff/core/lib/utils';
import { BRAND } from '@/brand';

const NEXT = [
  { icon: Search, text: 'Veja aulas, jogos e eventos perto de você' },
  { icon: QrCode, text: 'Reserve a vaga e pague por Pix direto para quem organiza' },
  { icon: CalendarCheck, text: 'Mostre o ingresso na hora e avalie depois' },
];

const OnboardingStudent = () => {
  const navigate = useNavigate();
  const { profile, updateProfile, isLoading, isUpdating } = useProfile();
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');

  // Já configurado (ou organizador): segue para a tela certa
  useEffect(() => {
    if (!isLoading && profile) {
      if (profile.role !== 'student') navigate('/onboarding/pro', { replace: true });
      else if (profile.city) navigate('/feed', { replace: true });
    }
  }, [profile, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({ city: city.trim(), phone: phone.trim() || null, whatsapp_number: phone.trim() || null });
      navigate('/feed', { replace: true });
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Não foi possível salvar. Tente de novo.'));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0];

  return (
    <AuthShell
      product={BRAND.name}
      label="Só mais um passo"
      title={firstName ? `Onde você joga, ${firstName}?` : 'Onde você joga?'}
      subtitle="Com a sua cidade, mostramos primeiro o que está rolando perto de você."
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="space-y-4 flex-1">
          <Field label="Cidade" htmlFor="obs-city">
            <Input
              id="obs-city"
              autoComplete="address-level2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex: São Paulo"
              required
              minLength={2}
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="WhatsApp (opcional)" htmlFor="obs-phone" hint="Para quem organiza falar com você sobre a reserva.">
            <Input id="obs-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" className={FIELD_CLASS} />
          </Field>

          <section className="pt-2 space-y-2">
            <h2 className="type-label">Como funciona</h2>
            <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
              {NEXT.map((n) => (
                <li key={n.text} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-9 h-9 rounded-xl bg-brand/15 text-brand flex items-center justify-center shrink-0">
                    <n.icon className="w-4 h-4" strokeWidth={1.75} />
                  </span>
                  <span className="text-sm text-ink">{n.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <Button type="submit" size="lg" className="w-full mt-6 shadow-[var(--shadow-cta)]" disabled={isUpdating || city.trim().length < 2}>
          {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ver atividades'}
        </Button>
      </form>
    </AuthShell>
  );
};

export default OnboardingStudent;
