import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Info, } from 'lucide-react';
import { toast } from 'sonner';

import { useProfile } from '@/hooks/useProfile';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const proSchema = z.object({
  professionalType: z.string().min(1, 'Selecione o seu tipo de atuação'),
  credentialType: z.string().optional(),
  credentialNumber: z.string().optional(),
  bio: z.string().min(10, 'Sua bio deve ter pelo menos 10 caracteres').max(500),
  pixKeyType: z.string().min(1, 'Selecione o tipo de chave Pix'),
  pixKey: z.string().min(5, 'Informe sua chave Pix válida'),
});

type ProFormValues = z.infer<typeof proSchema>;

const OnboardingPro = () => {
  const navigate = useNavigate();
  const { profile, updateProfile, isLoading, isUpdating } = useProfile();
  const [step, setStep] = useState(1);

  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<ProFormValues>({
    resolver: zodResolver(proSchema),
    defaultValues: {
      professionalType: '',
      credentialType: '',
      credentialNumber: '',
      bio: '',
      pixKeyType: '',
      pixKey: '',
    }
  });

  const professionalType = useWatch({ control, name: 'professionalType' });
  const bio = useWatch({ control, name: 'bio' });


  // Redirect if already onboarded or not a pro
  useEffect(() => {
    if (!isLoading && profile) {
      if (profile.role !== 'professional') {
        navigate('/onboarding/student');
      } else if (profile.professional_type && profile.pix_key) {
        navigate('/dashboard');
      }
    }
  }, [profile, isLoading, navigate]);

  const onSubmit = async (data: ProFormValues) => {
    try {
      await updateProfile({
        professional_type: data.professionalType,
        credential_type: data.credentialType || null,
        credential_number: data.credentialNumber || null,
        bio: data.bio,
        pix_key_type: data.pixKeyType,
        pix_key: data.pixKey,
      });
      
      toast.success('Perfil configurado com sucesso! 🎉');
      navigate('/dashboard');
    } catch (error: unknown) {
      toast.error('Erro ao salvar perfil. Tente novamente.');
      console.error(error);
    }
  };

  if (isLoading) return <PageContainer headerTransparent><div className="p-8">Carregando...</div></PageContainer>;

  return (
    <PageContainer title="Complete seu Perfil" withBottomNav={false}>
      <div className="px-6 py-4 flex-1 flex flex-col">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-brand' : 'bg-white/10'}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-brand' : 'bg-white/10'}`} />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 space-y-6">
              <div>
                <h2 className="type-title mb-2">Quem é você?</h2>
                <p className="text-muted-foreground text-sm mb-6">Como os participantes vão encontrar você.</p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Área de Atuação</label>
                    <Select onValueChange={(v) => setValue('professionalType', v)}>
                      <SelectTrigger className="w-full bg-white/[0.05] border-white/10">
                        <SelectValue placeholder="Selecione sua profissão" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal_trainer">Personal Trainer</SelectItem>
                        <SelectItem value="physiotherapist">Fisioterapeuta</SelectItem>
                        <SelectItem value="instructor">Instrutor(a) / Professor(a)</SelectItem>
                        <SelectItem value="organizer">Organizador(a)</SelectItem>
                        <SelectItem value="coach">Coach Esportivo</SelectItem>
                        <SelectItem value="nutritionist">Nutricionista</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.professionalType && <span className="text-destructive text-xs">{errors.professionalType.message}</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Registro (Opcional)</label>
                      <Select onValueChange={(v) => setValue('credentialType', v)}>
                        <SelectTrigger className="w-full bg-white/[0.05] border-white/10">
                          <SelectValue placeholder="Ex: CREF" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CREF">CREF</SelectItem>
                          <SelectItem value="CREFITO">CREFITO</SelectItem>
                          <SelectItem value="CRM">CRM</SelectItem>
                          <SelectItem value="CRN">CRN</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Número</label>
                      <Input {...register('credentialNumber')} className="bg-white/[0.05] border-white/10" placeholder="123456-G/SP" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bio (Apresentação)</label>
                    <Textarea 
                      {...register('bio')} 
                      className="bg-white/[0.05] border-white/10 resize-none h-32" 
                      placeholder="Conte um pouco sobre sua experiência, metodologia e o que os participantes podem esperar das suas atividades..."
                    />
                    {errors.bio && <span className="text-destructive text-xs">{errors.bio.message}</span>}
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-6">
                <Button 
                  type="button" 
                  onClick={() => setStep(2)}
                  className="w-full h-12 bg-brand hover:brightness-105 text-brand-ink font-semibold rounded-xl"
                  disabled={!professionalType || !bio}
                >
                  Continuar
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 space-y-6 flex flex-col">
              <div>
                <h2 className="type-title mb-2">Como você recebe?</h2>
                <p className="text-muted-foreground text-sm mb-6">No Riff o dinheiro vai direto para a sua conta via Pix.</p>

                <div className="p-4 rounded-xl glass-card border-brand/20 bg-brand/5 flex items-start gap-3 mb-6">
                  <Info className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                  <p className="text-sm text-ink-muted">O participante reservará a atividade e enviará o Pix diretamente para essa chave. O comprovante será enviado para o seu WhatsApp.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Chave Pix</label>
                    <Select onValueChange={(v) => setValue('pixKeyType', v)}>
                      <SelectTrigger className="w-full bg-white/[0.05] border-white/10">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF / CNPJ</SelectItem>
                        <SelectItem value="phone">Telefone Celular</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="random">Chave Aleatória</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.pixKeyType && <span className="text-destructive text-xs">{errors.pixKeyType.message}</span>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sua Chave Pix</label>
                    <Input {...register('pixKey')} className="bg-white/[0.05] border-white/10" placeholder="Digite sua chave exata" />
                    {errors.pixKey && <span className="text-destructive text-xs">{errors.pixKey.message}</span>}
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-6 flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="h-12 w-1/3 border-white/10 hover:bg-white/5"
                >
                  Voltar
                </Button>
                <Button 
                  type="submit" 
                  className="h-12 flex-1 bg-brand hover:brightness-105 text-brand-ink font-semibold rounded-xl glow-emerald"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Salvando...' : 'Finalizar Perfil'}
                </Button>
              </div>
            </motion.div>
          )}
        </form>
      </div>
    </PageContainer>
  );
};

export default OnboardingPro;
