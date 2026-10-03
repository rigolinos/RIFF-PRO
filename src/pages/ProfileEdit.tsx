import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/utils';
import { Loader2, AtSign, Phone, MapPin, Link as LinkIcon, Camera } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { PageContainer } from '@/components/layout/PageContainer';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

export default function ProfileEdit() {
  const { profile, updateProfile, isLoading, isUpdating } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

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
      <PageContainer title="Editar Perfil" withBottomNav>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Meu Perfil" showBack withBottomNav>
      <div className="px-6 py-6 flex-1 flex flex-col">

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex-1 pb-8">

          {/* FOTO E NOME - COMUM A AMBOS */}
          <div className="space-y-4">
            <h3 className="type-subtitle">Identificação</h3>

            <div className="flex flex-col items-center mb-6 mt-4">
               <div className="relative">
                 <div className="w-24 h-24 rounded-full bg-white/5 overflow-hidden border-2 border-brand/20 flex items-center justify-center shadow-xl">
                    {avatar_url ? (
                      <img src={avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-brand font-bold text-3xl">{full_name?.charAt(0) || '?'}</span>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                        <Loader2 className="w-6 h-6 text-brand animate-spin" />
                      </div>
                    )}
                 </div>

                 <button 
                   type="button"
                   onClick={() => fileInputRef.current?.click()}
                   disabled={isUploading}
                   className="absolute bottom-0 right-0 bg-brand text-brand-ink p-2 rounded-full shadow-[0_4px_12px_var(--shadow-cta)] hover:brightness-105 transition-all active:scale-95"
                 >
                   <Camera className="w-4 h-4" />
                 </button>
                 <input 
                   type="file" 
                   accept="image/*" 
                   className="hidden" 
                   ref={fileInputRef} 
                   onChange={handleFileChange} 
                 />
               </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Completo</label>
                <Input {...register('full_name')} placeholder="Seu nome" className="bg-black/30 border-white/10 focus:border-brand/50" />
              </div>
            </div>
          </div>

          {/* CONTATO & LOCALIZAÇAO - COMUM A AMBOS */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="type-subtitle">Contato e Localização</h3>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5"><Phone className="w-3.5 h-3.5"/> Celular</label>
                  <Input {...register('phone')} placeholder="(00) 00000-0000" className="bg-black/30 border-white/10 focus:border-brand/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5"><AtSign className="w-3.5 h-3.5"/> Instagram</label>
                  <Input {...register('instagram_handle')} placeholder="@seu_usuario" className="bg-black/30 border-white/10 focus:border-brand/50" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> Cidade</label>
                  <Input {...register('city')} placeholder="Ex: São Paulo" className="bg-black/30 border-white/10 focus:border-brand/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Input {...register('state')} placeholder="SP" maxLength={2} className="bg-black/30 border-white/10 focus:border-brand/50 uppercase" />
                </div>
              </div>
            </div>
          </div>

          {/* PARTICIPANTE: BIO / OBJETIVOS */}
          {!isPro && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="type-subtitle">Sobre você (Opcional)</h3>
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quais são seus objetivos?</label>
                  <Textarea {...register('bio')} placeholder="Ex: Gosto de esportes ao ar livre e busco melhorar meu condicionamento..." className="bg-black/30 border-white/10 focus:border-brand/50 h-24 resize-none" />
                </div>
              </div>
            </div>
          )}

          {/* ORGANIZADOR: DETALHES DE NEGÓCIO */}
          {isPro && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="type-subtitle">Vitrine do Organizador</h3>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" /> URL Personalizada (Link da Bio)</label>
                  <div className="flex items-center">
                    <span className="bg-white/5 border border-r-0 border-white/10 px-3 py-2.5 rounded-l-md text-sm text-muted-foreground">riff.pro/@</span>
                    <Input {...register('public_slug')} placeholder="seunome" className="bg-black/30 border-white/10 focus:border-brand/50 rounded-l-none lowercase" />
                  </div>
                  <p className="text-xs text-muted-foreground">Use isso para compartilhar suas atividades no Instagram.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Bio Pública / Metodologia</label>
                  <Textarea {...register('bio')} placeholder="Como você trabalha? Qual seu diferencial?" className="bg-black/30 border-white/10 focus:border-brand/50 h-24 resize-none" />
                </div>

                <div id="pix" className="space-y-2 scroll-mt-24">
                  <label className="text-sm font-medium">WhatsApp Organizador (Reservas)</label>
                  <Input {...register('whatsapp_number')} placeholder="(00) 00000-0000" type="tel" className="bg-black/30 border-white/10 focus:border-brand/50" />
                </div>
              </div>

              <h3 className="type-subtitle pt-4">Dados Bancários (Recebimento)</h3>
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Chave Pix</label>
                    <Select onValueChange={(v) => setValue('pix_key_type', v)} value={pix_key_type}>
                      <SelectTrigger className="bg-black/30 border-white/10 focus:border-brand/50">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF / CNPJ</SelectItem>
                        <SelectItem value="phone">Telefone</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="random">Aleatória</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Chave Pix</label>
                    <Input {...register('pix_key')} placeholder="Sua chave..." className="bg-black/30 border-white/10 focus:border-brand/50" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-6">
            <Button 
              type="submit" 
              disabled={isUpdating}
              className="w-full h-12 bg-brand hover:brightness-105 text-brand-ink font-bold rounded-xl shadow-[0_8px_24px_var(--shadow-cta)] active:scale-95 transition-all"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
            </Button>
          </div>
        </form>

                <div className="mt-8 pt-8 border-t border-danger pb-4 space-y-4">
          <h3 className="type-subtitle text-danger">Zona de Perigo</h3>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full h-12 text-danger border-danger hover:bg-danger/15 font-semibold"
              >
                Excluir Minha Conta (LGPD)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-background border-danger">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-danger">Você tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta, removerá seus dados dos nossos servidores e cancelará todas as suas atividades e reservas ativas.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="my-4 space-y-2">
                <label className="text-sm font-medium">Digite <span className="font-bold text-danger">EXCLUIR</span> para confirmar:</label>
                <Input 
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="bg-black/30 border-white/10"
                  placeholder="EXCLUIR"
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/5 hover:bg-white/10 border-0">Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteAccount();
                  }}
                  disabled={deleteConfirmation !== 'EXCLUIR' || isDeleting}
                  className="bg-danger/15 hover:bg-danger/15 text-bg font-bold"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sim, excluir minha conta'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button 
            onClick={handleLogout} 
            variant="ghost" 
            className="w-full h-12 text-muted-foreground hover:text-bg hover:bg-white/5 font-semibold"
          >
            Sair da Conta (Logout)
          </Button>
        </div>

      </div>
    </PageContainer>
  );
}
