import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { errorMessage } from '@riff/core/lib/utils';
import {
  Loader2,
  AtSign,
  Phone,
  MapPin,
  Link as LinkIcon,
  Camera,
  ChevronRight,
  FileText,
  LogOut,
  MessageCircle,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { HeroHeader } from '@riff/core/layout/HeroHeader';
import { Avatar, TicketGrid } from '@riff/core/domain';
import { chipClass } from '@riff/core/lib/chips';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@riff/core/ui/alert-dialog';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
import { Textarea } from '@riff/core/ui/textarea';
import { useProfile } from '@riff/core/hooks/useProfile';
import { supabase } from '@riff/core/supabase/client';
import { ModeSwitcher } from '@/components/layout/ModeSwitcher';
import { BRAND } from '@/brand';
import { SportsProfileSection } from '@/components/profile/SportsProfileSection';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useMySportsProfile } from '@/hooks/useSportsProfile';

const PIX_TYPES = [
  { value: 'cpf', label: 'CPF ou CNPJ' },
  { value: 'phone', label: 'Telefone' },
  { value: 'email', label: 'E-mail' },
  { value: 'random', label: 'Aleatória' },
];

export default function ProfileEdit() {
  const { profile, updateProfile, isLoading, isUpdating } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { viewMode } = useViewMode();
  // No modo participante, o perfil mostra o lado esportista (só a própria pessoa vê)
  const sportsMode = viewMode === 'student';
  const { data: sports } = useMySportsProfile();

  const { register, handleSubmit, setValue, reset, control } = useForm({
    defaultValues: {
      full_name: '',
      avatar_url: '',
      city: '',
      state: '',
      phone: '',
      instagram_handle: '',
      bio: '',
      public_slug: '',
      whatsapp_number: '',
      pix_key_type: '',
      pix_key: '',
    }
  });
  const avatar_url = useWatch({ control, name: 'avatar_url' });
  const full_name = useWatch({ control, name: 'full_name' });
  const pix_key_type = useWatch({ control, name: 'pix_key_type' });

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name || '',
        avatar_url: profile.avatar_url || '',
        city: profile.city || '',
        state: profile.state || '',
        phone: profile.phone || '',
        instagram_handle: profile.instagram_handle || '',
        bio: profile.bio || '',
        public_slug: profile.public_slug || '',
        whatsapp_number: profile.whatsapp_number || '',
        pix_key_type: profile.pix_key_type || '',
        pix_key: profile.pix_key || '',
      });
    }
  }, [profile, reset]);

  // Vindo do painel ("Cadastrar Pix"): rola até WhatsApp e Pix depois que o perfil carrega
  useEffect(() => {
    if (profile && window.location.hash === '#pix') {
      document.getElementById('pix')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [profile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0 || !profile) {
        return;
      }
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${uuidv4()}.${fileExt}`;
      const filePath = `${fileName}`;

      setIsUploading(true);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      setValue('avatar_url', data.publicUrl);
      await updateProfile({ avatar_url: data.publicUrl });
      toast.success('Foto de perfil atualizada!');
    } catch (error: Error | unknown) {
      toast.error(errorMessage(error, 'Erro ao fazer upload da imagem.'));
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: Record<string, string | null | undefined>) => {
    try {
      // Basic normalization
      if (data.instagram_handle && data.instagram_handle.startsWith('@')) {
        data.instagram_handle = data.instagram_handle.substring(1);
      }

      await updateProfile(data);
      toast.success('Perfil atualizado com sucesso!');
    } catch {
      toast.error('Erro ao atualizar perfil.');
    }
  };

    const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'EXCLUIR') return;

    setIsDeleting(true);
    try {
      // A função do banco não mexe no Storage: as fotos de perfil saem antes.
      if (profile?.id) {
        const { data: files, error: listError } = await supabase.storage.from('avatars').list('', { search: profile.id });
        const paths = (files ?? []).map((f) => f.name).filter((name) => name.startsWith(`${profile.id}-`));
        const { error: removeError } = paths.length
          ? await supabase.storage.from('avatars').remove(paths)
          : { error: null };
        if (listError || removeError) console.error('Erro ao remover fotos de perfil', listError ?? removeError);
      }

      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;

      await supabase.auth.signOut();
      window.location.href = '/';
      toast.success('Conta excluída com sucesso.');
    } catch (error: Error | unknown) {
      console.error(error);
      toast.error('Erro ao excluir conta. Verifique se você tem dependências pendentes.');
      setIsDeleting(false);
    }
  };

  const isPro = profile?.role === 'professional';

  if (isLoading) {
    return (
      <PageContainer withBottomNav>
        <div className="flex-1 flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
      </PageContainer>
    );
  }

  const slug = profile?.public_slug || profile?.id;
  const FIELD = 'h-12 bg-elevated border-line';
  const LABEL = 'text-sm font-medium text-ink flex items-center gap-1.5';
  const ROW = 'flex items-center gap-3 px-4 py-3.5 text-sm text-ink';

  return (
    <PageContainer withBottomNav>
      {/* Cabeçalho: foto, nome e papel */}
      <HeroHeader overlap={sportsMode ? !!sports : isPro} topLeft={<ModeSwitcher />} topRight={<span />} contentClassName="text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Avatar src={avatar_url} name={full_name} className="w-24 h-24 ring-4 ring-bg" fallbackClassName="text-3xl" />
            {isUploading && (
              <span className="absolute inset-0 rounded-full bg-bg/60 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-brand animate-spin" />
              </span>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              aria-label="Trocar foto"
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-brand text-brand-ink flex items-center justify-center ring-4 ring-surface active:scale-95"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          </div>
          <h1 className="type-title mt-1">{full_name || 'Seu nome'}</h1>
          <p className="text-xs text-ink-muted">
            {isPro ? 'Organizador' : 'Participante'}
            {profile?.city ? ` · ${profile.city}` : ''}
          </p>
          {isPro && slug && (
            <Link to={`/@${slug}`} className="text-xs font-semibold text-brand underline underline-offset-4">
              Ver minha vitrine ({BRAND.domain}/@{slug})
            </Link>
          )}
        </div>
      </HeroHeader>

      {sportsMode && sports && (
        <TicketGrid
          items={[
            { label: 'Atividades', value: sports.games, sub: 'que você foi' },
            { label: 'Frequência', value: sports.attendance == null ? '—' : `${sports.attendance}%`, sub: 'de presença' },
            { label: 'Avaliações', value: sports.reviews_given, sub: 'que você deu' },
          ]}
        />
      )}

      {!sportsMode && isPro && (
        <TicketGrid
          items={[
            { label: 'Nota', value: profile?.total_reviews ? Number(profile.rating_avg ?? 0).toFixed(1) : '—', sub: `${profile?.total_reviews ?? 0} avaliações` },
            { label: 'Atividades', value: profile?.total_sessions_given ?? 0, sub: 'realizadas' },
            { label: 'Participantes', value: profile?.total_students_served ?? 0, sub: 'atendidos' },
          ]}
        />
      )}

      <div className="px-4 py-6 space-y-6">
        {sportsMode && sports && <SportsProfileSection p={sports} />}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <section className="bg-surface border border-line rounded-2xl p-4 space-y-4">
            <h2 className="type-label">Seus dados</h2>
            <label className="block space-y-2">
              <span className={LABEL}>Nome completo</span>
              <Input {...register('full_name')} placeholder="Seu nome" className={FIELD} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className={LABEL}>
                  <Phone className="w-3.5 h-3.5" /> Celular
                </span>
                <Input {...register('phone')} placeholder="(00) 00000-0000" className={FIELD} />
              </label>
              <label className="block space-y-2">
                <span className={LABEL}>
                  <AtSign className="w-3.5 h-3.5" /> Instagram
                </span>
                <Input {...register('instagram_handle')} placeholder="@seu_usuario" className={FIELD} />
              </label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="col-span-2 block space-y-2">
                <span className={LABEL}>
                  <MapPin className="w-3.5 h-3.5" /> Cidade
                </span>
                <Input {...register('city')} placeholder="Ex: São Paulo" className={FIELD} />
              </label>
              <label className="block space-y-2">
                <span className={LABEL}>Estado</span>
                <Input {...register('state')} placeholder="SP" maxLength={2} className={`${FIELD} uppercase`} />
              </label>
            </div>
          </section>

          {!isPro ? (
            <section className="bg-surface border border-line rounded-2xl p-4 space-y-2">
              <h2 className="type-label">Sobre você (opcional)</h2>
              <Textarea
                {...register('bio')}
                placeholder="Seus objetivos: Ex: gosto de esportes ao ar livre e quero melhorar o condicionamento."
                className="bg-elevated border-line h-24 resize-none"
              />
            </section>
          ) : (
            <>
              <section className="bg-surface border border-line rounded-2xl p-4 space-y-4">
                <h2 className="type-label">Sua vitrine</h2>
                <label className="block space-y-2">
                  <span className={LABEL}>
                    <LinkIcon className="w-3.5 h-3.5" /> Link da bio
                  </span>
                  <div className="flex items-center">
                    <span className="h-12 bg-bg border border-r-0 border-line px-3 rounded-l-md text-sm text-ink-muted flex items-center">@</span>
                    <Input {...register('public_slug')} placeholder="seunome" className={`${FIELD} rounded-l-none lowercase`} />
                  </div>
                  <span className="block text-xs text-ink-muted">Coloque na bio do Instagram: quem abre vê suas atividades e reserva.</span>
                </label>
                <label className="block space-y-2">
                  <span className={LABEL}>Bio e metodologia</span>
                  <Textarea {...register('bio')} placeholder="Como você trabalha? Qual seu diferencial?" className="bg-elevated border-line h-24 resize-none" />
                </label>
              </section>

              <section id="pix" className="bg-surface border border-line rounded-2xl p-4 space-y-4 scroll-mt-24">
                <h2 className="type-label">Recebimento</h2>
                <label className="block space-y-2">
                  <span className={LABEL}>
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp para reservas
                  </span>
                  <Input {...register('whatsapp_number')} placeholder="(00) 00000-0000" type="tel" className={FIELD} />
                </label>
                <div className="space-y-2">
                  <span className={LABEL}>
                    <Wallet className="w-3.5 h-3.5" /> Tipo de chave Pix
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {PIX_TYPES.map((t) => (
                      <button key={t.value} type="button" aria-pressed={pix_key_type === t.value} onClick={() => setValue('pix_key_type', t.value)} className={chipClass(pix_key_type === t.value)}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block space-y-2">
                  <span className={LABEL}>Chave Pix</span>
                  <Input {...register('pix_key')} placeholder="Sua chave" className={FIELD} />
                  <span className="block text-xs text-ink-muted">Aparece para quem reserva, junto do QR do Pix com o valor certo.</span>
                </label>
              </section>
            </>
          )}

          <Button type="submit" size="lg" disabled={isUpdating} className="w-full">
            {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar alterações'}
          </Button>
        </form>

        <section className="space-y-2">
          <h2 className="type-label px-2">Conta</h2>
          <div className="bg-surface border border-line rounded-2xl divide-y divide-line">
            {[
              { path: '/termos', title: 'Termos de Uso', icon: FileText },
              { path: '/privacidade', title: 'Política de Privacidade', icon: ShieldCheck },
              ...(isPro ? [{ path: '/termos-organizador', title: 'Termo do Organizador', icon: FileText }] : []),
            ].map((doc) => (
              <Link key={doc.path} to={doc.path} className={ROW}>
                <doc.icon className="w-5 h-5 text-ink-muted" />
                <span className="flex-1">{doc.title}</span>
                <ChevronRight className="w-4 h-4 text-ink-muted" />
              </Link>
            ))}
          </div>
          <div className="bg-surface border border-line rounded-2xl divide-y divide-line">
            <button type="button" onClick={handleLogout} className={`${ROW} w-full`}>
              <LogOut className="w-5 h-5 text-ink-muted" />
              <span className="flex-1 text-left">Sair</span>
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button type="button" className={`${ROW} w-full text-danger`}>
                  <Trash2 className="w-5 h-5" />
                  <span className="flex-1 text-left">Excluir minha conta</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-surface border-line sm:rounded-3xl gap-6">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display text-xl text-ink">Excluir sua conta?</AlertDialogTitle>
                  <AlertDialogDescription className="text-ink-muted">
                    A conta é a mesma do Riff Clubes: ela sai dos dois apps. Suas reservas e atividades futuras são canceladas e seus
                    dados pessoais são apagados. Não dá para desfazer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <label className="block space-y-2">
                  <span className="text-sm text-ink">
                    Digite <strong>EXCLUIR</strong> para confirmar
                  </span>
                  <Input value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} className="h-11 bg-elevated border-line" placeholder="EXCLUIR" />
                </label>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel className="bg-elevated border-line">Voltar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteAccount();
                    }}
                    disabled={deleteConfirmation !== 'EXCLUIR' || isDeleting}
                    className="bg-danger text-bg font-bold hover:brightness-105"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir conta'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
