import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Apple, Dumbbell, HandHeart, Info, Loader2, Megaphone, Shapes, Timer, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@riff/core/hooks/useProfile';
import { AuthShell } from '@riff/core/layout/AuthShell';
import { Field } from '@riff/core/domain/Field';
import { FIELD_CLASS } from '@riff/core/lib/fields';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
import { Textarea } from '@riff/core/ui/textarea';
import { chipClass } from '@riff/core/lib/chips';
import { cn, errorMessage } from '@riff/core/lib/utils';
import { BRAND } from '@/brand';

// Valores aceitos pelo banco (profiles_professional_type_check)
const TYPES = [
  { value: 'organizer', label: 'Organizador(a)', text: 'eventos, jogos, campeonatos', icon: Megaphone },
  { value: 'personal_trainer', label: 'Educador(a) físico', text: 'personal, funcional, corrida', icon: Dumbbell },
  { value: 'instructor', label: 'Instrutor(a)', text: 'lutas, dança, yoga, esportes', icon: Timer },
  { value: 'coach', label: 'Treinador(a)', text: 'equipes e atletas', icon: Trophy },
  { value: 'physiotherapist', label: 'Fisioterapeuta', text: 'reabilitação e prevenção', icon: HandHeart },
  { value: 'nutritionist', label: 'Nutricionista', text: 'alimentação e esporte', icon: Apple },
  { value: 'other', label: 'Outro', text: 'conta mais na apresentação', icon: Shapes },
];
const CREDENTIALS = ['CREF', 'CREFITO', 'CRN', 'CRM'];
const PIX_TYPES = [
  { value: 'cpf', label: 'CPF ou CNPJ', placeholder: 'Só os números' },
  { value: 'phone', label: 'Telefone', placeholder: '(11) 99999-9999' },
  { value: 'email', label: 'E-mail', placeholder: 'voce@email.com' },
  { value: 'random', label: 'Aleatória', placeholder: 'Cole a chave aleatória' },
];

const OnboardingPro = () => {
  const navigate = useNavigate();
  const { profile, updateProfile, isLoading, isUpdating } = useProfile();
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState('');
  const [credential, setCredential] = useState('');
  const [credentialNumber, setCredentialNumber] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [pixType, setPixType] = useState('');
  const [pixKey, setPixKey] = useState('');

  // Já configurado (ou participante): segue para a tela certa
  useEffect(() => {
    if (!isLoading && profile) {
      if (profile.role !== 'professional') navigate('/onboarding/student', { replace: true });
      else if (profile.professional_type && profile.pix_key) navigate('/dashboard', { replace: true });
    }
  }, [profile, isLoading, navigate]);

  const step1Missing = !type ? 'Escolha como você atua' : city.trim().length < 2 ? 'Informe sua cidade' : bio.trim().length < 10 ? 'Escreva uma apresentação curta' : '';
  const step2Missing = !pixType ? 'Escolha o tipo da chave Pix' : pixKey.trim().length < 5 ? 'Informe a chave Pix' : '';

  const finish = async () => {
    try {
      await updateProfile({
        professional_type: type,
        credential_type: credential || null,
        credential_number: credential ? credentialNumber.trim() || null : null,
        city: city.trim(),
        bio: bio.trim(),
        whatsapp_number: whatsapp.trim() || null,
        pix_key_type: pixType,
        pix_key: pixKey.trim(),
      });
      toast.success('Tudo pronto! Agora é publicar sua primeira atividade.');
      navigate('/dashboard', { replace: true });
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

  if (step === 1) {
    return (
      <AuthShell
        product={BRAND.name}
        progress={{ step: 1, total: 2 }}
        label="Seu perfil de organizador"
        title={firstName ? `Prazer, ${firstName}!` : 'Prazer!'}
        subtitle="Conta rapidinho o que você organiza. É isso que aparece na sua vitrine para quem vai reservar."
      >
        <div className="space-y-6 flex-1">
          <section className="space-y-2">
            <h2 className="type-label">O que você organiza?</h2>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Área de atuação">
              {TYPES.map((t) => {
                const active = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setType(t.value)}
                    className={cn(
                      'flex items-start gap-2.5 rounded-2xl border p-3 text-left transition-all active:scale-[.98]',
                      active ? 'bg-brand/10 border-brand' : 'bg-surface border-line',
                      t.value === 'organizer' && 'col-span-2',
                    )}
                  >
                    <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', active ? 'bg-brand text-brand-ink' : 'bg-elevated text-ink-muted')}>
                      <t.icon className="w-4 h-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{t.label}</span>
                      <span className="block text-xs text-ink-muted">{t.text}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="type-label">Registro profissional (opcional)</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={!credential} onClick={() => setCredential('')} className={chipClass(!credential)}>
                Não tenho
              </button>
              {CREDENTIALS.map((c) => (
                <button key={c} type="button" aria-pressed={credential === c} onClick={() => setCredential(c)} className={chipClass(credential === c)}>
                  {c}
                </button>
              ))}
            </div>
            {credential && (
              <Input
                aria-label={`Número do ${credential}`}
                value={credentialNumber}
                onChange={(e) => setCredentialNumber(e.target.value)}
                placeholder={credential === 'CREF' ? 'Ex: 123456-G/SP' : 'Número do registro'}
                className={FIELD_CLASS}
              />
            )}
          </section>

          <Field label="Cidade" htmlFor="ob-city" hint="Quem procura atividades na sua cidade encontra você.">
            <Input id="ob-city" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Porto Alegre" className={FIELD_CLASS} />
          </Field>

          <Field label="Apresentação" htmlFor="ob-bio" hint={`${bio.trim().length}/500 · o que a pessoa pode esperar das suas atividades`}>
            <Textarea
              id="ob-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              placeholder="Ex: Organizo jogos de vôlei de praia aos sábados, para todos os níveis. Bola e rede por minha conta."
              className="bg-elevated border-line rounded-xl resize-none h-28"
            />
          </Field>
        </div>

        <div className="pt-6 space-y-2">
          <Button size="lg" className="w-full" onClick={() => setStep(2)} disabled={!!step1Missing}>
            Continuar
          </Button>
          {step1Missing && <p className="text-center text-xs text-ink-muted">{step1Missing}</p>}
        </div>
      </AuthShell>
    );
  }

  const pix = PIX_TYPES.find((p) => p.value === pixType);

  return (
    <AuthShell
      product={BRAND.name}
      progress={{ step: 2, total: 2 }}
      label="Recebimento"
      title="Como você recebe?"
      subtitle="No Riff o dinheiro vai direto para você, por Pix. Sem intermediário no caminho."
      onBack={() => setStep(1)}
    >
      <div className="space-y-6 flex-1">
        <p className="flex items-start gap-2 rounded-2xl border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-ink-muted">
          <Info className="w-5 h-5 text-brand shrink-0" />
          Quem reserva vê o QR do Pix com o valor certo e manda o comprovante no seu WhatsApp.
        </p>

        <section className="space-y-2">
          <h2 className="type-label">Tipo da chave Pix</h2>
          <div className="flex flex-wrap gap-2">
            {PIX_TYPES.map((t) => (
              <button key={t.value} type="button" aria-pressed={pixType === t.value} onClick={() => setPixType(t.value)} className={chipClass(pixType === t.value)}>
                {t.label}
              </button>
            ))}
          </div>
        </section>

        <Field label="Chave Pix" htmlFor="ob-pix" hint="Confira com cuidado: é para essa chave que o dinheiro vai.">
          <Input
            id="ob-pix"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            placeholder={pix?.placeholder ?? 'Escolha o tipo acima'}
            inputMode={pixType === 'cpf' || pixType === 'phone' ? 'numeric' : pixType === 'email' ? 'email' : undefined}
            disabled={!pixType}
            className={FIELD_CLASS}
          />
        </Field>

        <Field label="WhatsApp para reservas (recomendado)" htmlFor="ob-whats" hint="Para receber comprovantes e dúvidas de quem reservou.">
          <Input id="ob-whats" type="tel" autoComplete="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" className={FIELD_CLASS} />
        </Field>
      </div>

      <div className="pt-6 space-y-2">
        <Button size="lg" className="w-full shadow-[var(--shadow-cta)]" onClick={finish} disabled={!!step2Missing || isUpdating}>
          {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Concluir e ir para o painel'}
        </Button>
        {step2Missing && <p className="text-center text-xs text-ink-muted">{step2Missing}</p>}
      </div>
    </AuthShell>
  );
};

export default OnboardingPro;
