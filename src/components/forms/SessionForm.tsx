import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Sparkles, AlertTriangle, MessageCircle, MapPin, Calendar, Clock, DollarSign, Users } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SessionCard } from '@/components/cards/SessionCard';
import { useCategories } from '@/hooks/useCategories';
import { useProfile } from '@/hooks/useProfile';

const TEMPLATES: Record<string, {title: string, description: string}[]> = {
  'futevolei': [
    { title: 'Clínica de Saque e Smash', description: 'Treino focado em fundamentos ofensivos para pontuar mais.' },
    { title: 'Jogo Guiado + Tática', description: 'Partidas com correções de posicionamento em tempo real.' },
    { title: 'Treino Físico na Areia', description: 'Condicionamento intenso com bola para melhorar a resistência.' },
  ],
  'yoga': [
    { title: 'Vinyasa Flow (Energia)', description: 'Sequência dinâmica para despertar o corpo e a mente.' },
    { title: 'Hatha (Alinhamento)', description: 'Posturas clássicas com foco em consciência corporal.' },
    { title: 'Relaxamento e Alongamento', description: 'Aula suave para soltar tensões e acalmar a ansiedade.' },
  ],
  'crossfit': [
    { title: 'Clínica de LPO', description: 'Técnica de arranco e arremesso para bater PRs.' },
    { title: 'Gymnastics Skill', description: 'Foco em movimentos ginásticos: Muscle-up, HSPU e Handstand.' },
    { title: 'WOD Queima Máxima', description: 'Treino metabólico de alta intensidade para condicionamento.' },
  ],
};

interface SessionFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
}

export function SessionForm({ initialData, onSubmit, isSubmitting }: SessionFormProps) {
  const { data: categories } = useCategories();
  const { profile } = useProfile();
  
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const isEditMode = !!initialData;
  const hasParticipants = isEditMode && initialData.current_participants > 0;

  const form = useForm({
    defaultValues: {
      category_id: initialData?.category_id || '',
      title: initialData?.title || '',
      description: initialData?.description || '',
      max_participants: initialData?.max_participants || 10,
      date: initialData?.date || '',
      start_time: initialData?.start_time || '',
      duration_minutes: initialData?.duration_minutes || 60,
      location_name: initialData?.location_name || '',
      price_per_slot: initialData?.price_per_slot || 0,
      what_to_bring: initialData?.what_to_bring || '',
    }
  });

  const { watch, setValue, handleSubmit, register } = form;
  const formData = watch();

  const selectedCategorySlug = useMemo(() => {
    return categories?.find(c => c.id === formData.category_id)?.slug;
  }, [categories, formData.category_id]);

  const activeTemplates = selectedCategorySlug ? TEMPLATES[selectedCategorySlug] : [];

  const handleTemplateClick = (temp: any) => {
    setValue('title', temp.title, { shouldValidate: true });
    if (!formData.description) {
      setValue('description', temp.description, { shouldValidate: true });
    }
  };

  // Build the mock session for the Live Preview
  const previewSession = useMemo(() => {
    const cat = categories?.find(c => c.id === formData.category_id);
    return {
      id: initialData?.id || 'preview-123',
      title: formData.title || 'Título da sua Aula',
      date: formData.date || new Date().toISOString().split('T')[0],
      start_time: formData.start_time || '00:00',
      duration_minutes: formData.duration_minutes || 60,
      location_name: formData.location_name || 'Local da aula',
      price_per_slot: formData.price_per_slot || 0,
      max_participants: formData.max_participants || 10,
      current_participants: initialData?.current_participants || 0,
      status: 'active',
      category: cat ? { name: cat.name, emoji: cat.emoji } : { name: 'Categoria', emoji: '✨' },
      professional: {
        id: profile?.id,
        full_name: profile?.full_name || 'Seu Nome',
        avatar_url: profile?.avatar_url,
        rating_avg: profile?.rating_avg || 5.0,
        public_slug: profile?.public_slug
      }
    };
  }, [formData, categories, profile, initialData]);

  // Check if critical logistics changed
  const logisticsChanged = isEditMode && hasParticipants && (
    initialData.date !== formData.date ||
    initialData.start_time !== formData.start_time ||
    initialData.location_name !== formData.location_name
  );

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const onFinalSubmit = async (data: any) => {
    await onSubmit(data);
  };

  const handleWhatsAppNotify = () => {
    const text = encodeURIComponent(`Olá turma! A aula "${initialData.title}" teve uma alteração.\n\nNova Data: ${formData.date}\nNovo Horário: ${formData.start_time}\nLocal: ${formData.location_name}\n\nQualquer dúvida, me avisem!`);
    window.open(`https://wa.me/?text=` + text, '_blank');
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full max-w-6xl mx-auto overflow-hidden min-h-screen">
      
      {/* LEFT: FORM (Wizard) */}
      <div className="flex-1 flex flex-col h-full bg-background relative z-10 lg:max-w-xl lg:border-r border-white/5 shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-foreground">
              {isEditMode ? 'Editar Aula' : 'Criar Nova Aula'}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Passo {step} de {totalSteps}
            </p>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex gap-1.5">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i <= step ? 'bg-emerald-500' : 'bg-white/10'}`} />
            ))}
          </div>
        </div>

        {/* MOBILE PREVIEW SECTION (Only visible on small screens) */}
        <div className="block lg:hidden px-6 pt-6 pb-2 border-b border-white/5 bg-white/[0.02]">
           <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Prévia ao Vivo</p>
           <div className="scale-95 origin-top">
             <SessionCard session={previewSession} onBookClick={() => {}} />
           </div>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto hide-scrollbar p-6">
          <form id="session-form" onSubmit={handleSubmit(onFinalSubmit)} className="space-y-6 pb-24">
            <AnimatePresence mode="wait">
              
              {/* STEP 1: A EXPERIÊNCIA */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">Modalidade</label>
                    <Select onValueChange={(v) => setValue('category_id', v)} value={formData.category_id}>
                      <SelectTrigger className="h-12 bg-black/40 border-white/10 focus:border-emerald-500/50 text-base">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {activeTemplates.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> Ideias que convertem
                      </p>
                      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                        {activeTemplates.map((temp, idx) => (
                          <button 
                            key={idx} type="button" onClick={() => handleTemplateClick(temp)}
                            className="shrink-0 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-full whitespace-nowrap hover:bg-emerald-500/20 transition-colors"
                          >
                            {temp.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Título Magnético</label>
                    <Input {...register('title')} placeholder="Ex: Treino Queima Máxima (Iniciante)" className="h-12 bg-black/40 border-white/10 text-base font-semibold focus:border-emerald-500/50" />
                    <p className="text-[11px] text-muted-foreground italic">Dica: Títulos com o benefício final vendem 3x mais.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Capacidade (Vagas)</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input {...register('max_participants')} type="number" min="1" className="h-12 pl-10 bg-black/40 border-white/10 text-base focus:border-emerald-500/50" />
                    </div>
                    {formData.max_participants < 6 && (
                      <p className="text-[11px] text-amber-400/90 font-medium bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 inline-block mt-1">
                        🔥 Turmas exclusivas geram escassez e esgotam rápido.
                      </p>
                    )}
                  </div>
                  
                </motion.div>
              )}

              {/* STEP 2: LOGÍSTICA */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Data</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input {...register('date')} type="date" className="h-12 pl-10 bg-black/40 border-white/10 focus:border-emerald-500/50 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Horário</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input {...register('start_time')} type="time" className="h-12 pl-10 bg-black/40 border-white/10 focus:border-emerald-500/50 text-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Duração (minutos)</label>
                    <Input {...register('duration_minutes')} type="number" step="15" className="h-12 bg-black/40 border-white/10 focus:border-emerald-500/50" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Local</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input {...register('location_name')} placeholder="Ex: Parque Ibirapuera - Portão 7" className="h-12 pl-10 bg-black/40 border-white/10 focus:border-emerald-500/50" />
                    </div>
                  </div>

                </motion.div>
              )}

              {/* STEP 3: OFERTA & EXTRA */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Preço por Vaga (R$)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input {...register('price_per_slot')} type="number" step="0.01" disabled={hasParticipants} className="h-12 pl-10 bg-black/40 border-white/10 text-xl font-bold tabular-nums focus:border-emerald-500/50 disabled:opacity-50" />
                    </div>
                    {hasParticipants && (
                      <p className="text-[11px] text-amber-400/90 font-medium bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 inline-flex items-center gap-1.5 mt-1">
                        <AlertTriangle className="w-3 h-3" /> Já existem inscritos. O preço não pode ser alterado.
                      </p>
                    )}
                    {!hasParticipants && formData.price_per_slot == 0 && (
                       <p className="text-[11px] text-emerald-400/90 italic mt-1">Aula 100% gratuita configurada (ótimo para atrair leads).</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Descrição / O que levar (Opcional)</label>
                    <Textarea {...register('description')} placeholder="Ex: Traga sua própria raquete, água e protetor solar." className="h-24 bg-black/40 border-white/10 focus:border-emerald-500/50 resize-none" />
                  </div>

                  {logisticsChanged && (
                    <div className="glass-card p-4 border-amber-500/30 bg-amber-500/5 rounded-xl">
                      <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4" /> Alerta de Alteração
                      </h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        Você mudou a Data, Horário ou Local de uma aula que já possui <strong>{initialData.current_participants} alunos confirmados</strong>.
                      </p>
                      <button 
                        type="button" onClick={handleWhatsAppNotify}
                        className="w-full h-10 bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 font-semibold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" /> Avisar Turma no WhatsApp
                      </button>
                    </div>
                  )}

                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </ScrollArea>

        {/* BOTTOM NAV / WIZARD CONTROLS */}
        <div className="p-4 border-t border-white/5 bg-background/80 backdrop-blur-xl absolute bottom-0 left-0 right-0 flex gap-3">
          {step > 1 && (
            <Button type="button" onClick={prevStep} variant="outline" className="h-12 w-12 shrink-0 rounded-xl bg-white/5 border-white/10 hover:bg-white/10">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          
          {step < totalSteps ? (
            <Button type="button" onClick={nextStep} className="h-12 flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base shadow-[0_8px_24px_rgba(16,185,129,0.3)]">
              Próximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" form="session-form" disabled={isSubmitting} className="h-12 flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base shadow-[0_8px_24px_rgba(16,185,129,0.3)]">
              {isSubmitting ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Publicar Aula')} 
              {!isSubmitting && <Check className="w-4 h-4 ml-1.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* RIGHT: LIVE PREVIEW (Desktop) / TOP (Mobile handled via visual stacking, but for now we render it alongside and use CSS) */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-[#010E12] p-8 relative overflow-hidden">
        {/* Decorative Grid / Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_100%)] pointer-events-none" />
        
        <div className="w-full max-w-[340px] relative z-10">
          <div className="mb-6 flex items-center justify-center gap-2 text-emerald-400/60 uppercase tracking-widest text-xs font-bold">
            <Sparkles className="w-4 h-4" /> Prévia ao vivo
          </div>
          
          <div className="scale-105 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(16,185,129,0.1)] rounded-3xl">
            <SessionCard session={previewSession} onBookClick={() => {}} />
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8 px-6">
            É exatamente assim que os alunos verão sua aula no Feed e no seu perfil público.
          </p>
        </div>
      </div>
      
    </div>
  );
}

const ScrollArea = ({ children, className }: any) => <div className={`overflow-y-auto ${className}`}>{children}</div>;
