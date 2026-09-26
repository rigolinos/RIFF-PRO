import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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

  const { register, handleSubmit, setValue, reset, watch } = useForm({
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
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer upload da imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      // Basic normalization
      if (data.instagram_handle && data.instagram_handle.startsWith('@')) {
        data.instagram_handle = data.instagram_handle.substring(1);
      }
      
      await updateProfile(data);
      toast.success('Perfil atualizado com sucesso!');
    } catch (err) {
      toast.error('Erro ao atualizar perfil.');
    }
  };

    const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'EXCLUIR') return;
    
    setIsDeleting(true);
    try {
      const { error } = await (supabase.rpc as any)('delete_user_account');
      if (error) throw error;
      
      await supabase.auth.signOut();
      window.location.href = '/';
      toast.success('Conta excluída com sucesso.');
    } catch (error: any) {
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
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
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
            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">IdentificaÃ§Ã£o</h3>
            
            <div className="flex flex-col items-center mb-6 mt-4">
               <div className="relative">
                 <div className="w-24 h-24 rounded-full bg-white/5 overflow-hidden border-2 border-emerald-500/20 flex items-center justify-center shadow-xl">
                    {watch('avatar_url') ? (
                      <img src={watch('avatar_url')} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-emerald-500 font-bold text-3xl">{watch('full_name')?.charAt(0) || '?'}</span>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                      </div>
                    )}
                 </div>
                 
                 <button 
                   type="button"
                   onClick={() => fileInputRef.current?.click()}
                   disabled={isUploading}
                   className="absolute bottom-0 right-0 bg-emerald-500 text-slate-950 p-2 rounded-full shadow-[0_4px_12px_rgba(16,185,129,0.4)] hover:bg-emerald-400 transition-all active:scale-95"
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
                <Input {...register('full_name')} placeholder="Seu nome" className="bg-black/30 border-white/10 focus:border-emerald-500/50" />
              </div>
            </div>
          </div>

          {/* CONTATO & LOCALIZAÃ‡ÃƒO - COMUM A AMBOS */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Contato e LocalizaÃ§Ã£o</h3>
            
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5"><Phone className="w-3.5 h-3.5"/> Celular</label>
                  <Input {...register('phone')} placeholder="(00) 00000-0000" className="bg-black/30 border-white/10 focus:border-emerald-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5"><AtSign className="w-3.5 h-3.5"/> Instagram</label>
                  <Input {...register('instagram_handle')} placeholder="@seu_usuario" className="bg-black/30 border-white/10 focus:border-emerald-500/50" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> Cidade</label>
                  <Input {...register('city')} placeholder="Ex: SÃ£o Paulo" className="bg-black/30 border-white/10 focus:border-emerald-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Input {...register('state')} placeholder="SP" maxLength={2} className="bg-black/30 border-white/10 focus:border-emerald-500/50 uppercase" />
                </div>
              </div>
            </div>
          </div>

          {/* ALUNO: BIO / OBJETIVOS */}
          {!isPro && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Sobre vocÃª (Opcional)</h3>
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quais sÃ£o seus objetivos?</label>
                  <Textarea {...register('bio')} placeholder="Ex: Gosto de esportes ao ar livre e busco melhorar meu condicionamento..." className="bg-black/30 border-white/10 focus:border-emerald-500/50 h-24 resize-none" />
                </div>
              </div>
            </div>
          )}

          {/* PROFISSIONAL: DETALHES DE NEGÃ“CIO */}
          {isPro && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Vitrine Profissional</h3>
              
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" /> URL Personalizada (Link da Bio)</label>
                  <div className="flex items-center">
                    <span className="bg-white/5 border border-r-0 border-white/10 px-3 py-2.5 rounded-l-md text-sm text-muted-foreground">riff.pro/@</span>
                    <Input {...register('public_slug')} placeholder="seunome" className="bg-black/30 border-white/10 focus:border-emerald-500/50 rounded-l-none lowercase" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Use isso para compartilhar suas aulas no Instagram.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Bio PÃºblica / Metodologia</label>
                  <Textarea {...register('bio')} placeholder="Como vocÃª trabalha? Qual seu diferencial?" className="bg-black/30 border-white/10 focus:border-emerald-500/50 h-24 resize-none" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">WhatsApp Profissional (Reservas)</label>
                  <Input {...register('whatsapp_number')} placeholder="(00) 00000-0000" type="tel" className="bg-black/30 border-white/10 focus:border-emerald-500/50" />
                </div>
              </div>

              <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider pt-4">Dados BancÃ¡rios (Recebimento)</h3>
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Chave Pix</label>
                    <Select onValueChange={(v) => setValue('pix_key_type', v)} value={watch('pix_key_type')}>
                      <SelectTrigger className="bg-black/30 border-white/10 focus:border-emerald-500/50">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF / CNPJ</SelectItem>
                        <SelectItem value="phone">Telefone</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="random">AleatÃ³ria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Chave Pix</label>
                    <Input {...register('pix_key')} placeholder="Sua chave..." className="bg-black/30 border-white/10 focus:border-emerald-500/50" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-6">
            <Button 
              type="submit" 
              disabled={isUpdating}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-[0_8px_24px_rgba(16,185,129,0.3)] active:scale-95 transition-all"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar AlteraÃ§Ãµes'}
            </Button>
          </div>
        </form>

                <div className="mt-8 pt-8 border-t border-red-500/20 pb-4 space-y-4">
          <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wider">Zona de Perigo</h3>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full h-12 text-red-500 border-red-500/20 hover:bg-red-500/10 font-semibold"
              >
                Excluir Minha Conta (LGPD)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-background border-red-500/20">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-500">Você tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta, removerá seus dados dos nossos servidores e cancelará todas as suas aulas e reservas ativas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="my-4 space-y-2">
                <label className="text-sm font-medium">Digite <span className="font-bold text-red-400">EXCLUIR</span> para confirmar:</label>
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
                  className="bg-red-500 hover:bg-red-600 text-white font-bold"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sim, excluir minha conta'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button 
            onClick={handleLogout} 
            variant="ghost" 
            className="w-full h-12 text-muted-foreground hover:text-white hover:bg-white/5 font-semibold"
          >
            Sair da Conta (Logout)
          </Button>
        </div>

      </div>
    </PageContainer>
  );
}



