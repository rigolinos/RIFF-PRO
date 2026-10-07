import { useState, useMemo, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router-dom';
import { addDays, format, nextSaturday, nextSunday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CalendarDays,
  GraduationCap,
  ImagePlus,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  Search,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';

import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';
import { HeroHeader } from '@riff/core/layout/HeroHeader';
import { StickyActions } from '@riff/core/layout/StickyActions';
import { FormStep, SportIcon } from '@riff/core/domain';
import { Input } from '@riff/core/ui/input';
import { Textarea } from '@riff/core/ui/textarea';
import { Button } from '@riff/core/ui/button';
import { KINDS, type ActivityKind } from '@riff/core/lib/copy';
import { chipClass } from '@riff/core/lib/chips';
import { cn } from '@riff/core/lib/utils';
import { formatBRL } from '@riff/core/lib/money';
import { useCategories } from '@/hooks/useCategories';
import { useMyVenues } from '@/hooks/useMyVenues';
import { PlaceSearch } from '@riff/core/domain/PlaceSearch';
import type { SessionWithJoins } from '@/types/session';
import type { TablesInsert } from '@riff/core/supabase/types';

// Ideias de título por esporte (aulas)
const TEMPLATES: Record<string, { title: string; description: string }[]> = {
  futevolei: [
    { title: 'Clínica de Saque e Smash', description: 'Atividade focada em fundamentos ofensivos para pontuar mais.' },
    { title: 'Jogo Guiado + Tática', description: 'Partidas com correções de posicionamento em tempo real.' },
    { title: 'Condicionamento Físico na Areia', description: 'Condicionamento intenso com bola para melhorar a resistência.' },
  ],
  yoga: [
    { title: 'Vinyasa Flow (Energia)', description: 'Sequência dinâmica para despertar o corpo e a mente.' },
    { title: 'Hatha (Alinhamento)', description: 'Posturas clássicas com foco em consciência corporal.' },
    { title: 'Relaxamento e Alongamento', description: 'Atividade suave para soltar tensões e acalmar a ansiedade.' },
  ],
  crossfit: [
    { title: 'Clínica de LPO', description: 'Técnica de arranco e arremesso para bater PRs.' },
    { title: 'Gymnastics Skill', description: 'Foco em movimentos ginásticos: Muscle-up, HSPU e Handstand.' },
    { title: 'WOD Queima Máxima', description: 'Atividade metabólica de alta intensidade para condicionamento.' },
  ],
};

const KIND_ICONS: Record<ActivityKind, typeof GraduationCap> = {
  class: GraduationCap,
  match: Users,
  tournament: Trophy,
  event: CalendarDays,
  other: Sparkles,
};
const TIMES = ['06:00', '07:00', '08:00', '09:00', '18:00', '19:00', '20:00'];
const DURATIONS = [30, 45, 60, 90, 120];
const PRICES = [0, 20, 30, 40, 50];
const durationLabel = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60}h`);
const todaySP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const plain = (t: string) => t.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

interface SessionFormProps {
  initialData?: SessionWithJoins;
  onSubmit: (data: TablesInsert<'sessions'>) => Promise<void>;
  isSubmitting: boolean;
}

// Rascunho da criação de atividade; dado inválido ou armazenamento bloqueado não derruba a tela.
function readDraft() {
  try {
    return JSON.parse(localStorage.getItem('riff-session-draft') || 'null');
  } catch {
    return null;
  }
}

export function SessionForm({ initialData, onSubmit, isSubmitting }: SessionFormProps) {
  const { data: categories } = useCategories();
  const { profile } = useProfile();
  const { data: myVenues } = useMyVenues();
  // Busca de endereço puxa para perto dos locais que o organizador já usa
  const nearVenue = useMemo(() => {
    const v = myVenues?.find((x) => x.latitude != null && x.longitude != null);
    return v ? { latitude: Number(v.latitude), longitude: Number(v.longitude) } : null;
  }, [myVenues]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sportSearch, setSportSearch] = useState('');
  const [showAllSports, setShowAllSports] = useState(false);

  const isEditMode = !!initialData;
  const hasParticipants = isEditMode && (initialData.current_participants ?? 0) > 0;
  const savedDraft = !isEditMode ? readDraft() : null;

  const form = useForm({
    defaultValues: savedDraft
      ? { ...savedDraft, kind: savedDraft.kind || initialData?.kind || 'class' }
      : {
          kind: initialData?.kind || 'class',
          category_id: initialData?.category_id || '',
          title: initialData?.title || '',
          description: initialData?.description || '',
          max_participants: initialData?.max_participants || 10,
          date: initialData?.date || '',
          start_time: initialData?.start_time?.substring(0, 5) || '',
          duration_minutes: initialData?.duration_minutes || (initialData?.kind ? KINDS[initialData.kind as ActivityKind]?.defaultDuration : 60),
          location_name: initialData?.location_name || '',
          location_address: initialData?.location_address || null,
          latitude: initialData?.latitude ?? null,
          longitude: initialData?.longitude ?? null,
          meeting_point: initialData?.meeting_point || '',
          city: initialData?.city || null,
          price_per_slot: initialData?.price_per_slot || 0,
          what_to_bring: initialData?.what_to_bring || '',
          cover_image_url: initialData?.cover_image_url || '',
        },
  });

  const { setValue, handleSubmit, register } = form;
  const formData = useWatch({ control: form.control });

  useEffect(() => {
    if (isEditMode) return;
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem('riff-session-draft', JSON.stringify(formData));
      } catch {
        // armazenamento indisponível: segue sem rascunho
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [formData, isEditMode]);

  const kind = (formData.kind || 'class') as ActivityKind;
  const category = categories?.find((c) => c.id === formData.category_id);
  const activeTemplates = category?.slug && kind === 'class' ? (TEMPLATES[category.slug] ?? []) : [];
  const filteredSports = (categories ?? []).filter((c) => plain(c.name).includes(plain(sportSearch)));
  const visibleSports = sportSearch || showAllSports ? filteredSports : filteredSports.slice(0, 9);
  const spots = Number(formData.max_participants) || 1;
  const price = Number(formData.price_per_slot) || 0;
  const duration = Number(formData.duration_minutes) || KINDS[kind].defaultDuration;

  const today = parseISO(todaySP());
  const quickDates = useMemo(() => {
    const list = [
      { label: 'Hoje', value: format(today, 'yyyy-MM-dd') },
      { label: 'Amanhã', value: format(addDays(today, 1), 'yyyy-MM-dd') },
      { label: 'Sábado', value: format(nextSaturday(today), 'yyyy-MM-dd') },
      { label: 'Domingo', value: format(nextSunday(today), 'yyyy-MM-dd') },
    ];
    return list.filter((d, i) => list.findIndex((x) => x.value === d.value) === i);
  }, [today]);

  // Mudou data, horário ou local de uma atividade que já tem inscritos?
  const logisticsChanged =
    isEditMode &&
    hasParticipants &&
    (initialData.date !== formData.date ||
      initialData.start_time?.substring(0, 5) !== formData.start_time?.substring(0, 5) ||
      initialData.location_name !== formData.location_name);

  const missing = !formData.category_id
    ? 'Escolha o esporte.'
    : !formData.title?.trim()
      ? 'Dê um nome para a atividade.'
      : !(spots >= 1)
        ? 'Informe quantas vagas a atividade tem.'
        : !formData.date
          ? 'Escolha o dia.'
          : !formData.start_time
            ? 'Escolha o horário.'
            : !formData.location_name?.trim()
              ? 'Informe o local.'
              : null;

  const onFinalSubmit = async (data: TablesInsert<'sessions'>) => {
    if (missing) {
      toast.error(missing);
      return;
    }
    // Cidade da atividade: a do perfil do organizador (usada no filtro do feed).
    if (!isEditMode && !data.city && profile?.city) data.city = profile.city;
    await onSubmit(data);
  };

  const handleWhatsAppNotify = () => {
    const text = encodeURIComponent(
      `Olá pessoal! A atividade "${initialData?.title}" teve uma alteração.\n\nNova data: ${formData.date}\nNovo horário: ${formData.start_time}\nLocal: ${formData.location_name}\n\nQualquer dúvida, me avisem!`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      const fileExt = file.name.split('.').pop();
      const filePath = `sessions/${profile?.id}-${uuidv4()}.${fileExt}`;
      setIsUploading(true);
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setValue('cover_image_url', data.publicUrl, { shouldValidate: true });
      toast.success('Foto da atividade atualizada.');
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || 'Erro ao enviar a imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form id="session-form" onSubmit={handleSubmit(onFinalSubmit)} className="min-h-screen bg-bg">
      <HeroHeader
        overlap
        showBack
        imageUrl={formData.cover_image_url || undefined}
        label={isEditMode ? 'Editar atividade' : 'Nova atividade'}
        title={isEditMode ? 'Ajuste os detalhes' : 'Monte sua atividade'}
        subtitle={isEditMode ? 'Quem já reservou continua com a vaga.' : 'Monte em poucos toques. A prévia mostra como vai aparecer.'}
      />

      {/* Prévia ao vivo, no formato do ingresso */}
      <div className="relative z-10 -mt-10 mx-4 bg-elevated border border-line rounded-2xl shadow-[var(--shadow-2)] overflow-hidden" aria-live="polite">
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 min-w-0">
          <SportIcon slug={category?.slug} className="w-5 h-5 text-brand shrink-0" />
          <p className={cn('type-subtitle truncate flex-1', !formData.title?.trim() && 'text-ink-muted')}>{formData.title?.trim() || 'Nome da atividade'}</p>
          <span className={cn('text-sm font-bold font-display shrink-0', price > 0 ? 'text-accent' : 'text-success')}>
            {price > 0 ? formatBRL(price) : 'Grátis'}
          </span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line border-t border-dashed border-line">
          <div className="p-2.5 text-center">
            <p className="type-label">Dia</p>
            <p className="text-sm font-semibold text-ink">{formData.date ? format(parseISO(formData.date), 'EEEEEE, d MMM', { locale: ptBR }) : '—'}</p>
          </div>
          <div className="p-2.5 text-center">
            <p className="type-label">Horário</p>
            <p className="text-sm font-semibold text-ink">{formData.start_time ? `${formData.start_time.substring(0, 5)} · ${durationLabel(duration)}` : '—'}</p>
          </div>
          <div className="p-2.5 text-center">
            <p className="type-label">Vagas</p>
            <p className="text-sm font-semibold text-ink">{spots}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4 pb-40">
        <FormStep n={1} title="O que você vai organizar?" hint={hasParticipants ? 'Com inscritos, o tipo não muda.' : undefined}>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(KINDS) as ActivityKind[]).map((k) => {
              const Icon = KIND_ICONS[k];
              const active = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={active}
                  disabled={hasParticipants && !active}
                  onClick={() => {
                    setValue('kind', k);
                    if (!isEditMode) setValue('duration_minutes', KINDS[k].defaultDuration);
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-semibold transition-colors disabled:opacity-40',
                    active ? 'bg-brand text-brand-ink border-brand' : 'bg-elevated border-line text-ink-muted',
                  )}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                  {KINDS[k].chip}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-ink-muted">{KINDS[kind].description}</p>
        </FormStep>

        <FormStep n={2} title="Qual esporte?">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <Input value={sportSearch} onChange={(e) => setSportSearch(e.target.value)} placeholder="Buscar esporte" aria-label="Buscar esporte" className="h-12 pl-9 bg-elevated border-line" />
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleSports.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={formData.category_id === c.id}
                onClick={() => setValue('category_id', c.id)}
                className={cn(chipClass(formData.category_id === c.id), 'flex items-center gap-1.5')}
              >
                <SportIcon slug={c.slug} className="w-4 h-4" /> {c.name}
              </button>
            ))}
            {!sportSearch && !showAllSports && filteredSports.length > 9 && (
              <button type="button" onClick={() => setShowAllSports(true)} className="h-9 px-3 text-sm font-semibold text-brand">
                Ver todos ({filteredSports.length})
              </button>
            )}
          </div>
        </FormStep>

        <FormStep n={3} title="Nome e foto" hint="Nomes com o benefício final atraem mais gente.">
          {activeTemplates.length > 0 && (
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {activeTemplates.map((t) => (
                <button
                  key={t.title}
                  type="button"
                  onClick={() => {
                    setValue('title', t.title, { shouldValidate: true });
                    if (!formData.description) setValue('description', t.description, { shouldValidate: true });
                  }}
                  className="shrink-0 h-8 px-3 rounded-full bg-brand/10 border border-brand/30 text-brand text-xs font-medium flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> {t.title}
                </button>
              ))}
            </div>
          )}
          <Input {...register('title')} placeholder={KINDS[kind].titlePlaceholder} maxLength={80} aria-label="Nome da atividade" className="h-12 bg-elevated border-line font-semibold" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-full h-28 rounded-xl border border-dashed border-line bg-elevated flex items-center justify-center gap-2 overflow-hidden text-sm text-ink-muted"
          >
            {formData.cover_image_url ? (
              <>
                <img src={formData.cover_image_url} alt="Foto da atividade" className="absolute inset-0 w-full h-full object-cover" />
                <span className="relative px-3 h-8 rounded-full bg-bg/70 text-ink text-xs font-semibold flex items-center">Trocar foto</span>
              </>
            ) : (
              <>
                <ImagePlus className="w-5 h-5" /> Adicionar foto (opcional)
              </>
            )}
            {isUploading && (
              <span className="absolute inset-0 bg-bg/60 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-brand animate-spin" />
              </span>
            )}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
        </FormStep>

        <FormStep n={4} title="Quando?">
          <div className="flex flex-wrap gap-2">
            {quickDates.map((d) => (
              <button key={d.value} type="button" aria-pressed={formData.date === d.value} onClick={() => setValue('date', d.value)} className={chipClass(formData.date === d.value)}>
                {d.label}
              </button>
            ))}
          </div>
          <Input {...register('date')} type="date" min={todaySP()} aria-label="Outra data" className="h-12 bg-elevated border-line" />
          <p className="text-xs text-ink-muted pt-1">Horário</p>
          <div className="flex flex-wrap gap-2">
            {TIMES.map((t) => (
              <button key={t} type="button" aria-pressed={formData.start_time?.substring(0, 5) === t} onClick={() => setValue('start_time', t)} className={chipClass(formData.start_time?.substring(0, 5) === t)}>
                {t}
              </button>
            ))}
            <Input {...register('start_time')} type="time" aria-label="Outro horário" className="h-9 w-28 bg-surface border-line" />
          </div>
          <p className="text-xs text-ink-muted pt-1">Duração</p>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((m) => (
              <button key={m} type="button" aria-pressed={duration === m} onClick={() => setValue('duration_minutes', m)} className={chipClass(duration === m)}>
                {durationLabel(m)}
              </button>
            ))}
          </div>
        </FormStep>

        <FormStep n={5} title="Onde?">
          <PlaceSearch
            value={formData.location_name ?? ''}
            pinned={formData.latitude != null && formData.longitude != null}
            near={nearVenue}
            onTextChange={(text) => {
              setValue('location_name', text, { shouldDirty: true });
              // escreveu outro lugar: o endereço e o ponto anteriores deixam de valer
              setValue('location_address', null, { shouldDirty: true });
              setValue('latitude', null, { shouldDirty: true });
              setValue('longitude', null, { shouldDirty: true });
            }}
            onPick={(place) => {
              setValue('location_name', place.name, { shouldDirty: true });
              setValue('location_address', place.address || null, { shouldDirty: true });
              setValue('latitude', place.latitude, { shouldDirty: true });
              setValue('longitude', place.longitude, { shouldDirty: true });
              if (place.city) setValue('city', place.city, { shouldDirty: true });
            }}
          />
          {myVenues && myVenues.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Seus locais">
              {myVenues.map((venue) => (
                <button
                  key={venue.id}
                  type="button"
                  aria-pressed={formData.location_name === venue.name}
                  onClick={() => {
                    setValue('location_name', venue.name, { shouldDirty: true });
                    setValue('location_address', venue.address ?? null, { shouldDirty: true });
                    setValue('latitude', venue.latitude ?? null, { shouldDirty: true });
                    setValue('longitude', venue.longitude ?? null, { shouldDirty: true });
                    if (venue.city) setValue('city', venue.city, { shouldDirty: true });
                  }}
                  className={chipClass(formData.location_name === venue.name)}
                >
                  {venue.name}
                </button>
              ))}
            </div>
          )}
          <Input
            {...register('meeting_point')}
            maxLength={120}
            placeholder="Ponto de encontro (opcional). Ex: perto do chafariz"
            aria-label="Ponto de encontro"
            className="h-12 bg-elevated border-line"
          />
        </FormStep>

        <FormStep n={6} title={KINDS[kind].capacityLabel}>
          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              aria-label="Menos vagas"
              onClick={() => setValue('max_participants', Math.max(1, spots - 1))}
              className="w-11 h-11 rounded-full bg-elevated border border-line flex items-center justify-center text-ink active:scale-95"
            >
              <Minus className="w-5 h-5" />
            </button>
            <input
              type="number"
              min={1}
              max={500}
              value={spots}
              onChange={(e) => setValue('max_participants', Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
              aria-label="Número de vagas"
              className="type-display w-20 text-center bg-transparent text-ink focus:outline-none"
            />
            <button
              type="button"
              aria-label="Mais vagas"
              onClick={() => setValue('max_participants', Math.min(500, spots + 1))}
              className="w-11 h-11 rounded-full bg-elevated border border-line flex items-center justify-center text-ink active:scale-95"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {spots < 6 && kind === 'class' && <p className="text-xs text-accent text-center">Poucas vagas costumam esgotar rápido.</p>}
        </FormStep>

        <FormStep n={7} title="Preço por vaga" hint={hasParticipants ? 'Já existem inscritos: o preço não muda.' : 'O pagamento vai direto para você, via Pix.'}>
          <div className="flex flex-wrap gap-2">
            {PRICES.map((v) => (
              <button
                key={v}
                type="button"
                disabled={hasParticipants}
                aria-pressed={price === v}
                onClick={() => setValue('price_per_slot', v)}
                className={cn(chipClass(price === v), 'disabled:opacity-40')}
              >
                {v === 0 ? 'Grátis' : formatBRL(v)}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">R$</span>
            <Input
              {...register('price_per_slot')}
              type="number"
              step="0.01"
              min={0}
              disabled={hasParticipants}
              aria-label="Outro valor"
              className="h-12 pl-10 bg-elevated border-line text-lg font-bold tabular-nums disabled:opacity-50"
            />
          </div>
          {hasParticipants && (
            <p className="text-xs text-accent flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Com inscritos, o preço fica como está.
            </p>
          )}
          {price > 0 && !profile?.pix_key && (
            <p className="text-xs text-accent bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
              Você ainda não cadastrou sua chave Pix: quem reservar não verá como pagar.{' '}
              <Link to="/profile/edit#pix" className="underline underline-offset-2 font-semibold">
                Cadastrar agora
              </Link>
            </p>
          )}
          <p className="text-xs text-ink-muted leading-relaxed">
            Você recebe o pagamento direto e é o responsável pela atividade, pela segurança dos participantes e por cancelamentos e reembolsos,
            conforme o Termo do Organizador.
          </p>
        </FormStep>

        <FormStep n={8} title="Detalhes" hint="Opcional">
          <Textarea {...register('description')} placeholder={KINDS[kind].descriptionPlaceholder} aria-label="Descrição" className="h-24 bg-elevated border-line resize-none" />
          <Textarea {...register('what_to_bring')} placeholder="O que levar (um item por linha): garrafa d'água, toalha…" aria-label="O que levar" className="h-20 bg-elevated border-line resize-none" />
        </FormStep>

        {logisticsChanged && (
          <section className="rounded-2xl border border-accent/40 bg-accent/10 p-4 space-y-3">
            <h3 className="type-subtitle text-accent flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Avise quem já reservou
            </h3>
            <p className="text-xs text-ink-muted">
              Você mudou dia, horário ou local de uma atividade com {initialData.current_participants ?? 0} inscrito(s).
            </p>
            <button
              type="button"
              onClick={handleWhatsAppNotify}
              className="w-full h-10 rounded-xl bg-success/15 text-success font-semibold text-sm flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Avisar no WhatsApp
            </button>
          </section>
        )}
      </div>

      <StickyActions className="space-y-1">
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : isEditMode ? 'Salvar alterações' : 'Publicar atividade'}
        </Button>
        <p className="text-xs text-center text-ink-muted min-h-4">{missing ?? 'Tudo certo. Depois de publicar, é só compartilhar o link.'}</p>
      </StickyActions>
    </form>
  );
}
