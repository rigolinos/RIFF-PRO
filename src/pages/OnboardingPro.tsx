import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Apple, Dumbbell, HandHeart, Info, Loader2, Lock, Megaphone, Shapes, Timer, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@riff/core/hooks/useProfile';
import { useLegalAcceptance } from '@riff/core/hooks/useLegalAcceptance';
import { AuthShell } from '@riff/core/layout/AuthShell';
import { Field } from '@riff/core/domain/Field';
import { FIELD_CLASS } from '@riff/core/lib/fields';
import { Button } from '@riff/core/ui/button';
import { Checkbox } from '@riff/core/ui/checkbox';
import { Input } from '@riff/core/ui/input';
import { Textarea } from '@riff/core/ui/textarea';
import { chipClass } from '@riff/core/lib/chips';
import { cn } from '@riff/core/lib/utils';
import { safeRedirect } from '@riff/core/auth/redirect';
import { digits, isAdult, maskPhone, maskTaxId, taxIdKind } from '@riff/core/lib/taxId';
import { LEGAL_DOCUMENTS } from '@riff/core/legal/documents';
import { supabase } from '@riff/core/supabase/client';
import { useViewMode } from '@/contexts/ViewModeContext';
import { organizerErrorMessage, useOrganizerMissing } from '@/hooks/useOrganizer';
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

const todaySP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

type Profile = NonNullable<ReturnType<typeof useProfile>['profile']>;

// A "porta" de organizador: participante vira organizador, e organizador antigo completa os dados
const OnboardingPro = () => {
  const { profile, isLoading } = useProfile();
  const { data: missing, isLoading: loadingMissing } = useOrganizerMissing();
  const [params] = useSearchParams();
  const next = safeRedirect(params.get('next'), '/dashboard');

  if (isLoading || loadingMissing || !profile) {
    return (
      <div className="min-h-[100dvh] bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }
  // Já pode organizar: segue
  if (missing && missing.length === 0) return <Navigate to={next} replace />;
  return <OrganizerForm profile={profile} next={next} />;
};

function OrganizerForm({ profile, next }: { profile: Profile; next: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setViewMode } = useViewMode();
  const { missing: legalMissing, accept } = useLegalAcceptance();
  const upgrading = profile.role !== 'professional';
  const needsTerms = upgrading || legalMissing.includes('organizer_terms');
  const [today] = useState(todaySP);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [taxId, setTaxId] = useState('');
  const [taxTouched, setTaxTouched] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [whatsapp, setWhatsapp] = useState(maskPhone(profile.whatsapp_number ?? profile.phone ?? ''));
  const [type, setType] = useState(profile.professional_type ?? '');
  const [credential, setCredential] = useState(profile.credential_type ?? '');
  const [credentialNumber, setCredentialNumber] = useState(profile.credential_number ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [pixType, setPixType] = useState(profile.pix_key_type ?? '');
  const [pixKey, setPixKey] = useState(profile.pix_key ?? '');
  const [termsChecked, setTermsChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const firstName = fullName.trim().split(/\s+/)[0];
  const taxKind = taxIdKind(taxId);
  const step1Missing =
    fullName.trim().split(/\s+/).length < 2
      ? 'Informe nome e sobrenome'
      : !taxKind
        ? digits(taxId).length >= 11 ? 'Confira o CPF ou CNPJ' : 'Informe seu CPF ou CNPJ'
        : !birthDate
          ? 'Informe sua data de nascimento'
          : !isAdult(birthDate, today)
            ? 'Para organizar é preciso ter 18 anos ou mais'
            : digits(whatsapp).length < 10
              ? 'Informe seu celular com DDD'
              : '';
  const step2Missing = !type ? 'Escolha como você atua' : city.trim().length < 2 ? 'Informe sua cidade' : bio.trim().length < 10 ? 'Escreva uma apresentação curta' : '';
  const step3Missing = !pixType ? 'Escolha o tipo da chave Pix' : pixKey.trim().length < 5 ? 'Informe a chave Pix' : needsTerms && !termsChecked ? 'Aceite o Termo do Organizador' : '';

  const finish = async () => {
    setSaving(true);
    try {
      if (needsTerms) await accept(['organizer_terms']);
      const { error } = await supabase.rpc('become_organizer', {
        p_full_name: fullName.trim(),
        p_tax_id: digits(taxId),
        p_birth_date: birthDate,
        p_whatsapp: digits(whatsapp),
        p_professional_type: type,
        p_credential_type: credential,
        p_credential_number: credential ? credentialNumber.trim() : '',
        p_city: city.trim(),
        p_bio: bio.trim(),
        p_pix_key_type: pixType,
        p_pix_key: pixKey.trim(),
      });
      if (error) throw error;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['organizer-missing'] }),
        queryClient.invalidateQueries({ queryKey: ['legal-acceptances'] }),
      ]);
      setViewMode('professional');
      toast.success(upgrading ? 'Pronto! Agora você também organiza no Riff.' : 'Cadastro completo. Pode publicar.');
      navigate(next, { replace: true });
    } catch (error: unknown) {
      toast.error(organizerErrorMessage(error, 'Não foi possível salvar. Tente de novo.'));
    } finally {
      setSaving(false);
    }
  };

  const shellBase = { product: BRAND.name, progress: { step, total: 3 } };

  if (step === 1) {
    return (
      <AuthShell
        {...shellBase}
        onBack={() => navigate(-1)}
        label={upgrading ? 'Quero organizar' : 'Cadastro de organizador'}
        title={upgrading ? `Bora organizar${firstName ? `, ${firstName}` : ''}?` : 'Complete seu cadastro'}
        subtitle={
          upgrading
            ? 'Sua conta continua a mesma: você segue reservando atividades e ganha o painel de organizador. Primeiro, quem é você.'
            : 'Agora pedimos CPF, nascimento e celular de quem organiza, para a segurança de quem reserva. Leva um minuto.'
        }
      >
        <div className="space-y-4 flex-1">
          <Field label="Nome completo" htmlFor="ob-name" hint="Como aparece na sua vitrine.">
            <Input id="ob-name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome e sobrenome" className={FIELD_CLASS} />
          </Field>
          <Field
            label="CPF ou CNPJ"
            htmlFor="ob-tax"
            error={taxTouched && digits(taxId).length >= 11 && !taxKind ? 'Os números não conferem.' : undefined}
          >
            <Input
              id="ob-tax"
              inputMode="numeric"
              value={taxId}
              onChange={(e) => setTaxId(maskTaxId(e.target.value))}
              onBlur={() => setTaxTouched(true)}
              placeholder="000.000.000-00"
              className={FIELD_CLASS}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nascimento" htmlFor="ob-birth" error={birthDate && !isAdult(birthDate, today) ? 'Precisa ter 18+' : undefined}>
              <Input id="ob-birth" type="date" max={today} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={FIELD_CLASS} />
            </Field>
            <Field label="Celular (WhatsApp)" htmlFor="ob-whats">
              <Input
                id="ob-whats"
                type="tel"
                autoComplete="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className={FIELD_CLASS}
              />
            </Field>
          </div>
          <p className="flex items-start gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-xs text-ink-muted leading-relaxed">
            <Lock className="w-4 h-4 text-success shrink-0" />
            CPF/CNPJ e nascimento não aparecem no app: servem para identificar quem recebe pagamentos e proteger quem reserva. O celular só é
            usado por quem reservou com você, pelo botão de WhatsApp.{' '}
            <Link to="/privacidade" target="_blank" className="text-brand underline underline-offset-4">
              Privacidade
            </Link>
          </p>
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

  if (step === 2) {
    return (
      <AuthShell
        {...shellBase}
        onBack={() => setStep(1)}
        label="Sua vitrine"
        title="O que você organiza?"
        subtitle="É isso que aparece para quem vai reservar."
      >
        <div className="space-y-6 flex-1">
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
          <Button size="lg" className="w-full" onClick={() => setStep(3)} disabled={!!step2Missing}>
            Continuar
          </Button>
          {step2Missing && <p className="text-center text-xs text-ink-muted">{step2Missing}</p>}
        </div>
      </AuthShell>
    );
  }

  const pix = PIX_TYPES.find((p) => p.value === pixType);

  return (
    <AuthShell
      {...shellBase}
      onBack={() => setStep(2)}
      label="Recebimento"
      title="Como você recebe?"
      subtitle="No Riff o dinheiro vai direto para você, por Pix. Sem intermediário no caminho."
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

        {needsTerms && (
          <label className={cn('flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors', termsChecked ? 'bg-brand/10 border-brand/50' : 'bg-surface border-line')}>
            <Checkbox checked={termsChecked} onCheckedChange={(v) => setTermsChecked(v === true)} className="mt-0.5" />
            <span className="text-sm text-ink leading-relaxed">
              Li e aceito o{' '}
              <Link to={LEGAL_DOCUMENTS.organizer_terms.path} target="_blank" onClick={(e) => e.stopPropagation()} className="text-brand underline underline-offset-4">
                Termo do Organizador
              </Link>{' '}
              e declaro que sou o responsável pelas atividades que publico, pela segurança dos participantes e por pagamentos, cancelamentos e
              reembolsos.
            </span>
          </label>
        )}
      </div>

      <div className="pt-6 space-y-2">
        <Button size="lg" className="w-full shadow-[var(--shadow-cta)]" onClick={finish} disabled={!!step3Missing || saving}>
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : upgrading ? 'Virar organizador' : 'Salvar e continuar'}
        </Button>
        {step3Missing && <p className="text-center text-xs text-ink-muted">{step3Missing}</p>}
      </div>
    </AuthShell>
  );
}

export default OnboardingPro;
