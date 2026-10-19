import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { CalendarPlus, CheckCircle2, Eye, MessageCircle } from 'lucide-react';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';
import { StepFlow } from '@riff/core/layout/StepFlow';
import { BrandLines, ConfirmDialog } from '@riff/core/domain';
import { Button } from '@riff/core/ui/button';
import { nowSP } from '@riff/core/lib/activityTime';
import { suggestActivityTitle } from '@riff/core/lib/activityTitle';
import { errorMessage } from '@riff/core/lib/utils';
import { useCommunity } from '@/hooks/useCommunity';
import { useSpaceConflicts, useSpaces } from '@/hooks/useSpaces';
import { EVENT_STEPS, emptyEvent, eventInvite, eventStepMissing, firstEventMissing, type EventStep, type EventValues } from '@/lib/eventForm';
import { EventNameStep, EventReview, EventSportStep, EventSpotsStep, EventWhenStep, EventWhereStep } from '@/components/event/EventSteps';
import { useGoBack } from '@riff/core/routing/useGoBack';

type Screen = EventStep | 'review';

const COPY: Record<EventStep, { title: string; subtitle?: string }> = {
  sport: { title: 'Qual esporte?', subtitle: 'O tipo já vem escolhido; troque se quiser.' },
  when: { title: 'Quando vai ser?' },
  where: { title: 'Onde vai ser?', subtitle: 'Os espaços do grupo aparecem primeiro.' },
  spots: { title: 'Quantas vagas?' },
  name: { title: 'Como vai se chamar?', subtitle: 'Sugerimos um nome com o que você escolheu. Ajuste se quiser.' },
};

// Novo evento: uma pergunta por tela, revisão e o convite para o grupo do condomínio ou clube
export default function NewActivity() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const goBack = useGoBack();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { data: community, isLoading } = useCommunity(orgId);
  const [now] = useState(nowSP);

  const { data: categories } = useQuery({
    queryKey: ['categories', 'with-slug'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('id, name, slug').eq('is_active', true).order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });
  // Locais já usados pelo grupo (fora a sede e os espaços oficiais)
  const { data: venues } = useQuery({
    queryKey: ['community-venues', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('venues').select('id, name, official').eq('organization_id', orgId!).is('archived_at', null).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const [values, setValues] = useState<EventValues | null>(null);
  const [screen, setScreen] = useState<Screen>('sport');
  const [backToReview, setBackToReview] = useState(false);
  const [confirmConflict, setConfirmConflict] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [published, setPublished] = useState<{ id: string; title: string; date: string; time: string; place: string } | null>(null);

  // instrutor começa em Aula; morador, em Jogo
  const v = values ?? emptyEvent(community?.role === 'instructor' ? 'class' : 'match');
  const update = (patch: Partial<EventValues>) => setValues({ ...v, ...patch });
  const { data: spaces } = useSpaces(orgId);
  const { data: conflicts } = useSpaceConflicts(v.space_id, v.date, v.time, v.duration);

  if (!isLoading && community === null) return <Navigate to="/inicio" replace />;

  const category = categories?.find((c) => c.id === v.category_id);
  const sportName = v.sport_other ?? category?.name ?? '';
  const usedPlaces = (venues ?? []).filter((x) => !x.official && x.id !== community?.main_venue_id);
  const communityName = community?.name ?? 'seu grupo';

  const go = (next: Screen) => {
    if (next === 'name' && !v.title.trim()) {
      const suggestion = suggestActivityTitle({ kind: v.kind, sport: sportName, date: v.date, time: v.time });
      if (suggestion) update({ title: suggestion });
    }
    setScreen(next);
    window.scrollTo({ top: 0 });
  };

  const publish = async (confirmed = false) => {
    const missing = firstEventMissing(v, now);
    if (missing) {
      toast.error(eventStepMissing(missing, v, now) ?? 'Falta um dado.');
      setBackToReview(true);
      go(missing);
      return;
    }
    // espaço ocupado no mesmo horário: avisa antes de publicar
    if (!confirmed && conflicts && conflicts.length > 0) {
      setConfirmConflict(true);
      return;
    }
    if (!profile?.id || !orgId) return;
    setIsSaving(true);
    try {
      // product = 'clubes' e preço zero são definidos pelo banco (evento de condomínio ou clube)
      const { data: created, error } = await supabase
        .from('sessions')
        .insert({
          professional_id: profile.id,
          organization_id: orgId,
          category_id: v.category_id,
          ...(v.sport_other ? { sport_other: v.sport_other } : {}),
          kind: v.kind,
          title: v.title.trim(),
          description: v.description.trim() || null,
          date: v.date,
          start_time: v.time,
          duration_minutes: v.duration,
          location_name: v.place.trim(),
          venue_id: v.space_id,
          max_participants: v.spots,
          price_per_slot: 0,
          status: 'active',
          minors_allowed: !!v.minors_allowed,
          min_age: v.minors_allowed && v.min_age !== '' ? Number(v.min_age) : null,
        })
        .select('id')
        .single();
      if (error) throw error;
      void queryClient.invalidateQueries({ queryKey: ['community-agenda'] });
      void queryClient.invalidateQueries({ queryKey: ['community-venues', orgId] });
      setPublished({ id: created.id, title: v.title.trim(), date: v.date, time: v.time, place: v.place.trim() });
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Não foi possível publicar o evento.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (published) {
    const when = `${format(parseISO(published.date), "EEEE, d 'de' MMM", { locale: ptBR })} às ${published.time}`;
    const share = () =>
      window.open(
        `https://wa.me/?text=${encodeURIComponent(eventInvite({ title: published.title, when, place: published.place, community: communityName, url: `${window.location.origin}/atividade/${published.id}` }))}`,
        '_blank',
      );
    return (
      <div className="min-h-[100dvh] bg-bg text-ink w-full max-w-[480px] mx-auto overflow-x-hidden flex flex-col">
        <section className="relative overflow-hidden bg-surface border-b border-line px-6 pt-safe pb-10">
          <BrandLines className="absolute inset-y-0 right-0 h-full w-3/4" />
          <div className="relative pt-16 space-y-3">
            <span className="w-14 h-14 rounded-2xl bg-success/15 text-success flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </span>
            <p className="type-label text-success">Evento publicado</p>
            <h1 className="type-display">Agora chame os vizinhos</h1>
            <p className="text-sm text-ink-muted leading-relaxed">
              <span className="text-ink font-semibold">{published.title}</span> · <span className="first-letter:uppercase">{when}</span>. Já aparece na agenda de{' '}
              {communityName}.
            </p>
          </div>
        </section>
        <div className="flex-1 px-6 py-6 space-y-3">
          <Button size="lg" className="w-full shadow-[var(--shadow-cta)]" onClick={share}>
            <MessageCircle className="w-5 h-5 mr-2" /> Mandar no grupo do WhatsApp
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => navigate(`/atividade/${published.id}`, { replace: true })}>
              <Eye className="w-4 h-4 mr-2" /> Ver evento
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setPublished(null);
                setValues(null);
                setBackToReview(false);
                setScreen('sport');
              }}
            >
              <CalendarPlus className="w-4 h-4 mr-2" /> Criar outro
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'review') {
    return (
      <>
        <StepFlow
          label="Novo evento"
          title="Confira e publique"
          subtitle="É assim que o evento vai aparecer para os vizinhos."
          stepKey="review"
          onBack={() => go('name')}
          primary={{ label: 'Publicar evento', onClick: () => void publish(), loading: isSaving }}
          hint="Depois de publicar, você manda no grupo do WhatsApp."
        >
          <EventReview
            v={v}
            sportName={sportName}
            sportSlug={category?.slug}
            community={communityName}
            onEdit={(s) => {
              setBackToReview(true);
              go(s);
            }}
          />
        </StepFlow>
        <ConfirmDialog
          open={confirmConflict}
          onOpenChange={setConfirmConflict}
          title="Espaço ocupado nesse horário"
          description={`${v.place} já tem ${conflicts?.map((c) => `"${c.title}" (${c.start_time.slice(0, 5)} às ${c.end_time.slice(0, 5)})`).join(', ')}. Publicar mesmo assim?`}
          cancelLabel="Mudar horário"
          confirmLabel="Publicar mesmo assim"
          isLoading={isSaving}
          onConfirm={() => {
            setConfirmConflict(false);
            void publish(true);
          }}
        />
      </>
    );
  }

  const index = EVENT_STEPS.indexOf(screen);
  const missing = eventStepMissing(screen, v, now);
  const next = () => {
    if (missing) return;
    if (backToReview || index === EVENT_STEPS.length - 1) go('review');
    else go(EVENT_STEPS[index + 1]);
  };
  const back = () => {
    if (backToReview) go('review');
    else if (index === 0) goBack();
    else go(EVENT_STEPS[index - 1]);
  };

  return (
    <StepFlow
      label={`Novo evento · ${communityName}`}
      progress={{ step: index + 1, total: EVENT_STEPS.length }}
      title={COPY[screen].title}
      subtitle={COPY[screen].subtitle}
      stepKey={screen}
      onBack={back}
      primary={{ label: backToReview ? 'Voltar para a revisão' : index === EVENT_STEPS.length - 1 ? 'Revisar' : 'Continuar', onClick: next, disabled: !!missing }}
      hint={missing ?? undefined}
    >
      {screen === 'sport' && <EventSportStep v={v} update={update} categories={categories ?? []} />}
      {screen === 'when' && <EventWhenStep v={v} update={update} />}
      {screen === 'where' && <EventWhereStep v={v} update={update} spaces={spaces ?? []} usedPlaces={usedPlaces} conflicts={conflicts ?? []} />}
      {screen === 'spots' && <EventSpotsStep v={v} update={update} />}
      {screen === 'name' && <EventNameStep v={v} update={update} sportName={sportName} />}
    </StepFlow>
  );
}
