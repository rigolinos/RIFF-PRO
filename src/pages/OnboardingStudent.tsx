import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { useProfile } from '@riff/core/hooks/useProfile';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';

const studentSchema = z.object({
  city: z.string().min(2, 'Informe sua cidade'),
  phone: z.string().min(10, 'Informe um WhatsApp válido').optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

const OnboardingStudent = () => {
  const navigate = useNavigate();
  const { profile, updateProfile, isLoading, isUpdating } = useProfile();

  const { register, handleSubmit, formState: { errors } } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      city: '',
      phone: '',
    }
  });

  // Redirect if already onboarded or not a student
  useEffect(() => {
    if (!isLoading && profile) {
      if (profile.role !== 'student') {
        navigate('/onboarding/pro');
      } else if (profile.city) {
        navigate('/feed');
      }
    }
  }, [profile, isLoading, navigate]);

  const onSubmit = async (data: StudentFormValues) => {
    try {
      await updateProfile({
        city: data.city,
        phone: data.phone || null,
        whatsapp_number: data.phone || null, // Keeping both in sync
      });
      
      toast.success('Tudo pronto! Bem-vindo ao Riff 🚀');
      navigate('/feed');
    } catch (error: unknown) {
      toast.error('Erro ao salvar. Tente novamente.');
      console.error(error);
    }
  };

  if (isLoading) return <PageContainer headerTransparent><div className="p-8">Carregando...</div></PageContainer>;

  return (
    <PageContainer title="Só mais um passo" withBottomNav={false}>
      <div className="px-6 py-4 flex-1 flex flex-col">
        <div className="mb-8">
          <h2 className="type-title mb-2">Onde você vai treinar?</h2>
          <p className="text-muted-foreground text-sm">Precisamos saber sua cidade para mostrar as atividades mais próximas de você.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sua Cidade</label>
              <Input 
                {...register('city')} 
                className="bg-white/[0.05] border-white/10 h-12 text-lg" 
                placeholder="Ex: São Paulo, SP" 
              />
              {errors.city && <span className="text-destructive text-xs">{errors.city.message}</span>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">WhatsApp (Opcional)</label>
              <Input 
                {...register('phone')} 
                type="tel"
                className="bg-white/[0.05] border-white/10 h-12" 
                placeholder="(11) 99999-9999" 
              />
              <p className="text-xs text-muted-foreground">Usado para receber comprovantes de reserva via Pix.</p>
            </div>
          </div>

          <div className="mt-auto pt-6">
            <Button 
              type="submit" 
              className="w-full h-14 bg-brand hover:brightness-105 text-brand-ink font-bold rounded-xl glow-brand text-lg"
              disabled={isUpdating}
            >
              {isUpdating ? 'Salvando...' : 'Começar a Treinar'}
            </Button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
};

export default OnboardingStudent;
