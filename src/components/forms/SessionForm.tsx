import { useState, useMemo, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Sparkles, AlertTriangle, MessageCircle, MapPin, Calendar, Clock, DollarSign, Users, GraduationCap, Trophy, CalendarDays } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SessionCard } from '@/components/cards/SessionCard';
import { useCategories } from '@/hooks/useCategories';
import { useProfile } from '@/hooks/useProfile';
import { KINDS, ActivityKind } from '@/lib/copy';

import { SessionWithJoins } from '@/types/session';
import type { TablesInsert } from '@/integrations/supabase/types';

const TEMPLATES: Record<string, {title: string, description: string}[]> = {
  'futevolei': [
    { title: 'Clínica de Saque e Smash', description: 'Atividade focada em fundamentos ofensivos para pontuar mais.' },
    { title: 'Jogo Guiado + Tática', description: 'Partidas com correções de posicionamento em tempo real.' },
    { title: 'Condicionamento Físico na Areia', description: 'Condicionamento intenso com bola para melhorar a resistência.' },
  ],
  'yoga': [
    { title: 'Vinyasa Flow (Energia)', description: 'Sequência dinâmica para despertar o corpo e a mente.' },
    { title: 'Hatha (Alinhamento)', description: 'Posturas clássicas com foco em consciência corporal.' },
    { title: 'Relaxamento e Alongamento', description: 'Atividade suave para soltar tensões e acalmar a ansiedade.' },
  ],
  'crossfit': [
    { title: 'Clínica de LPO', description: 'Técnica de arranco e arremesso para bater PRs.' },
    { title: 'Gymnastics Skill', description: 'Foco em movimentos ginásticos: Muscle-up, HSPU e Handstand.' },
    { title: 'WOD Queima Máxima', description: 'Atividade metabólica de alta intensidade para condicionamento.' },
  ],
};

interface SessionFormProps {
  initialData?: SessionWithJoins;
  onSubmit: (data: TablesInsert<'sessions'>) => Promise<void>;
  isSubmitting: boolean;
}

export function SessionForm({ initialData, onSubmit, isSubmitting }: SessionFormProps) {
  const { data: categories } = useCategories();
  const { profile } = useProfile();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const isEditMode = !!initialData;
  const hasParticipants = isEditMode && (initialData.current_participants ?? 0) > 0;

  
  const savedDraft = !isEditMode ? JSON.parse(localStorage.getItem('riff-session-draft') || 'null') : null;
  
  const form = useForm({
    defaultValues: savedDraft ? { ...savedDraft, kind: savedDraft.kind || initialData?.kind || 'class' } : {
      kind: initialData?.kind || 'class',
        category_id: initialData?.category_id || '',
      title: initialData?.title || '',
      description: initialData?.description || '',
      max_participants: initialData?.max_participants || 10,
      date: initialData?.date || '',
      start_time: initialData?.start_time || '',
      duration_minutes: initialData?.duration_minutes || (formData.kind ? KINDS[formData.kind as ActivityKind]?.defaultDuration : 60),
      location_name: initialData?.location_name || '',
      price_per_slot: initialData?.price_per_slot || 0,
      what_to_bring: initialData?.what_to_bring || '',
      cover_image_url: initialData?.cover_image_url || '',
    }
  });

  const { setValue, handleSubmit, register } = form;
  const formData = useWatch({ control: form.control });

  useEffect(() => {
    if (!isEditMode) {
      const timeout = setTimeout(() => {
        localStorage.setItem('riff-session-draft', JSON.stringify(formData));
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [formData, isEditMode]);

  


  const selectedCategorySlug = useMemo(() => {
    return categories?.find(c => c.id === formData.category_id)?.slug;
  }, [categories, formData.category_id]);

  const activeTemplates = (selectedCategorySlug && formData.kind === 'class') ? TEMPLATES[selectedCategorySlug] : [];

  const handleTemplateClick = (temp: { title: string; description: string }) => {
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
      title: formData.title || 'Título da sua Atividade',
      date: formData.date || new Date().toISOString().split('T')[0],
      start_time: formData.start_time || '00:00',
      duration_minutes: formData.duration_minutes || (formData.kind ? KINDS[formData.kind as ActivityKind]?.defaultDuration : 60),
      location_name: formData.location_name || 'Local da atividade',
      price_per_slot: formData.price_per_slot || 0,
      max_participants: formData.max_participants || 10,
      current_participants: initialData?.current_participants || 0,
      status: 'active',
      cover_image_url: formData.cover_image_url || undefined,
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

  const onFinalSubmit = async (data: TablesInsert<'sessions'>) => {
    await onSubmit(data);
  };

  const handleWhatsAppNotify = () => {
    const text = encodeURIComponent(`Olá pessoal! A atividade "${(initialData?.title)}" teve uma alteração.\n\nNova Data: ${formData.date}\nNovo Horário: ${formData.start_time}\nLocal: ${formData.location_name}\n\nQualquer dúvida, me avisem!`);
    window.open(`https://wa.me/?text=` + text, '_blank');
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.id}-${uuidv4()}.${fileExt}`;
      const filePath = `sessions/${fileName}`;

      setIsUploading(true);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setValue('cover_image_url', data.publicUrl, { shouldValidate: true });
      toast.success('Imagem da atividade atualizada!');
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || 'Erro ao fazer upload da imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full max-w-6xl mx-auto overflow-hidden min-h-screen">
      
      {/* LEFT: FORM (Wizard) */}
      <div className="flex-1 flex flex-col h-full bg-bg relative z-10 lg:max-w-xl lg:border-r border-line shadow-2xl">
        <div className="p-6 border-b border-line flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="type-title">
              {isEditMode ? 'Editar Atividade' : 'Criar Nova Atividade'}
            </h1>
            <p className="text-xs text-ink-muted mt-1">
              Passo {step} de {totalSteps}
            </p>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex gap-1.5">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i <= step ? 'bg-brand' : 'bg-line'}`} />
            ))}
          </div>
        </div>

        {/* MOBILE PREVIEW SECTION (Only visible on small screens) */}
        <div className="block lg:hidden px-6 pt-6 pb-2 border-b border-line bg-white/[0.02]">
           <p className="type-label text-brand mb-3 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Prévia ao Vivo</p>
           <div className="scale-95 origin-top">
             <SessionCard session={previewSession as unknown as SessionWithJoins} onBookClick={() => {}} />
           </div>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto hide-scrollbar p-6">
          <form id="session-form" onSubmit={handleSubmit(onFinalSubmit)} className="space-y-6 pb-24">
            <AnimatePresence mode="wait">
              
              
              {/* STEP 1: O QUE VOCÊ VAI ORGANIZAR? */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="mb-4">
                    <h3 className="type-title mb-1">O que você vai organizar?</h3>
                    <p className="type-caption text-ink-muted">Escolha o que mais se parece com o seu caso. Dá para mudar depois.</p>
                  </div>
                  
                  <div className="grid gap-3">
                    {Object.entries(KINDS).map(([k, meta]) => {
                      const IconMap: Record<string, React.ElementType> = { GraduationCap, Users, Trophy, CalendarDays, Sparkles };
                      const Icon = IconMap[meta.icon] || Sparkles;
                      const isSelected = formData.kind === k;
                      return (
                        <div 
                          key={k}
                          onClick={() => {
                             if (hasParticipants) return;
                             setValue('kind', k as ActivityKind);
                             setStep(2);
                          }}
                          className={`relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            hasParticipants ? 'opacity-50 cursor-not-allowed border-line/50 bg-surface/50' : 
                            isSelected ? 'border-brand bg-brand/5' : 'border-line bg-surface hover:border-brand/30'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-brand text-brand-ink' : 'bg-white/5 text-ink-muted'}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h4 className="type-subtitle mb-0.5">{meta.label}</h4>
                            <p className="type-caption text-ink-muted">{meta.description}</p>
                            {meta.example && (
                              <p className="type-caption text-ink-muted mt-1 opacity-70">Ex: {meta.example}</p>
                            )}
                          </div>
                          
                          {hasParticipants && (
                             <div className="absolute right-3 top-3" title="Não pode mudar o tipo de uma atividade com participantes.">
                               <AlertTriangle className="w-4 h-4 text-accent" />
                             </div>
                          )}
                          <input type="radio" name="kind" value={k} checked={isSelected} readOnly className="sr-only" />
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* STEP 2: A EXPERIÊNCIA */}
              {step === 2 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  
                  {/* Image Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink flex items-center gap-2">Capa da Atividade</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-full aspect-video rounded-2xl border-2 border-dashed border-line bg-surface hover:bg-surface/80 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors"
                    >
                      {formData.cover_image_url ? (
                        <img src={formData.cover_image_url} alt="Capa" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center text-ink-muted">
                          <ImagePlus className="w-8 h-8 mb-2 opacity-50" />
                          <span className="text-sm font-medium">Adicionar Foto</span>
                          <span className="text-xs opacity-70">Formato 16:9 ideal</span>
                        </div>
                      )}
                      
                      {isUploading && (
                        <div className="absolute inset-0 bg-bg/60 backdrop-blur-sm flex items-center justify-center z-10">
                          <Loader2 className="w-8 h-8 text-brand animate-spin" />
                        </div>
                      )}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink flex items-center gap-2">Modalidade</label>
                    <Select onValueChange={(v) => setValue('category_id', v)} value={formData.category_id}>
                      <SelectTrigger className="h-12 bg-surface border-line focus:border-brand/50 text-base">
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
                      <p className="type-label text-brand flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> Ideias que convertem
                      </p>
                      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                        {activeTemplates.map((temp, idx) => (
                          <button 
                            key={idx} type="button" onClick={() => handleTemplateClick(temp)}
                            className="shrink-0 px-3 py-1.5 bg-brand/10 border border-brand/20 text-brand-ink text-xs rounded-full whitespace-nowrap hover:bg-brand/20 transition-colors"
                          >
                            {temp.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink">Título Magnético</label>
                    <Input {...register('title')} placeholder="Ex: Funcional na Praia Máxima (Iniciante)" className="h-12 bg-surface border-line text-base font-semibold focus:border-brand/50" />
                    <p className="text-xs text-ink-muted italic">Dica: Títulos com o benefício final vendem 3x mais.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink">Capacidade (Vagas)</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                      <Input {...register('max_participants')} type="number" min="1" className="h-12 pl-10 bg-surface border-line text-base focus:border-brand/50" />
                    </div>
                    {formData.max_participants < 6 && formData.kind === 'class' && (
                      <p className="text-xs text-accent font-medium bg-accent/15 px-2 py-1 rounded border border-accent/20 inline-block mt-1">
                        🔥 Poucas vagas costumam esgotar rápido.
                      </p>
                    )}
                  </div>
                  
                </motion.div>
              )}

              {/* STEP 3: LOGÍSTICA */}
              {step === 3 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-ink">Data</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                        <Input {...register('date')} type="date" className="h-12 pl-10 bg-surface border-line focus:border-brand/50 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-ink">Horário</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                        <Input {...register('start_time')} type="time" className="h-12 pl-10 bg-surface border-line focus:border-brand/50 text-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink">Duração (minutos)</label>
                    <Input {...register('duration_minutes')} type="number" step="15" className="h-12 bg-surface border-line focus:border-brand/50" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink">Local</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                      <Input {...register('location_name')} placeholder="Ex: Parque Ibirapuera - Portão 7" className="h-12 pl-10 bg-surface border-line focus:border-brand/50" />
                    </div>
                  </div>

                </motion.div>
              )}

              {/* STEP 4: OFERTA & EXTRA */}
              {step === 4 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink">Preço por Vaga (R$)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                      <Input {...register('price_per_slot')} type="number" step="0.01" disabled={hasParticipants} className="h-12 pl-10 bg-surface border-line text-xl font-bold tabular-nums focus:border-brand/50 disabled:opacity-50" />
                    </div>
                    {hasParticipants && (
                      <p className="text-xs text-accent font-medium bg-accent/15 px-2 py-1 rounded border border-accent/20 inline-flex items-center gap-1.5 mt-1">
                        <AlertTriangle className="w-3 h-3" /> Já existem inscritos. O preço não pode ser alterado.
                      </p>
                    )}
                    {!hasParticipants && formData.price_per_slot == 0 && (
                       <p className="text-xs text-brand/90 italic mt-1">Atividade 100% gratuita configurada (ótimo para atrair leads).</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink">Descrição / O que levar (Opcional)</label>
                    <Textarea {...register('description')} placeholder={KINDS[formData.kind as ActivityKind]?.descriptionPlaceholder} className="h-24 bg-surface border-line focus:border-brand/50 resize-none" />
                  </div>

                  {logisticsChanged && (
                    <div className="glass-card p-4 border-accent/20 bg-accent/15 rounded-xl">
                      <h4 className="type-subtitle text-accent flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4" /> Alerta de Alteração
                      </h4>
                      <p className="text-xs text-ink-muted mb-3">
                        Você mudou a Data, Horário ou Local de uma atividade que já possui <strong>{(initialData.current_participants ?? 0)} participantes confirmados</strong>.
                      </p>
                      <button 
                        type="button" onClick={handleWhatsAppNotify}
                        className="w-full h-10 bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 font-semibold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" /> Avisar Inscritos no WhatsApp
                      </button>
                    </div>
                  )}

                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </ScrollArea>

        {/* BOTTOM NAV / WIZARD CONTROLS */}
        <div className="p-4 border-t border-line bg-bg/80 backdrop-blur-xl absolute bottom-0 left-0 right-0 flex gap-3">
          {step > 1 && (
            <Button type="button" onClick={prevStep} variant="outline" className="h-12 w-12 shrink-0 rounded-xl bg-white/5 border-line hover:bg-line">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          
          {step < totalSteps ? (
            <Button type="button" onClick={nextStep} className="h-12 flex-1 rounded-xl bg-brand hover:bg-brand text-brand-ink font-bold text-base shadow-[0_8px_24px_var(--shadow-cta)]">
              Próximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" form="session-form" disabled={isSubmitting} className="h-12 flex-1 rounded-xl bg-brand hover:bg-brand text-brand-ink font-bold text-base shadow-[0_8px_24px_var(--shadow-cta)]">
              {isSubmitting ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Publicar Atividade')} 
              {!isSubmitting && <Check className="w-4 h-4 ml-1.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* RIGHT: LIVE PREVIEW (Desktop) / TOP (Mobile handled via visual stacking, but for now we render it alongside and use CSS) */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-bg p-8 relative overflow-hidden">
        {/* Decorative Grid / Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--brand-soft)_0%,transparent_100%)] pointer-events-none" />
        
        <div className="w-full max-w-[340px] relative z-10">
          <div className="mb-6 flex items-center justify-center gap-2 type-label text-brand/60">
            <Sparkles className="w-4 h-4" /> Prévia ao vivo
          </div>
          
          <div className="scale-105 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_var(--brand-soft)] rounded-3xl">
            <SessionCard session={previewSession as unknown as SessionWithJoins} onBookClick={() => {}} />
          </div>

          <p className="text-center text-xs text-ink-muted mt-8 px-6">
            É exatamente assim que os participantes verão sua atividade no Feed e no seu perfil público.
          </p>
        </div>
      </div>
      
    </div>
  );
}

const ScrollArea = ({ children, className }: { children: React.ReactNode, className?: string }) => <div className={`overflow-y-auto ${className}`}>{children}</div>;
