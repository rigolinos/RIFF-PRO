import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { AlertTriangle, FilePen, MessageCircle, RotateCcw } from 'lucide-react';
import { StepFlow } from '@riff/core/layout/StepFlow';
import { nowSP } from '@riff/core/lib/activityTime';
import { suggestActivityTitle } from '@riff/core/lib/activityTitle';
import { useCategories } from '@/hooks/useCategories';
import {
  STEPS,
  draftHasContent,
  emptyValues,
  firstMissingStep,
  readDraft,
  stepMissing,
  toSessionInsert,
  writeDraft,
  type SessionValues,
  type StepId,
} from '@/lib/sessionForm';
import { KindStep, NameStep, ReviewStep, SportStep, SpotsStep, WhenStep, WhereStep } from './SessionSteps';
import type { TablesInsert } from '@riff/core/supabase/types';

type Screen = StepId | 'review';

const COPY: Record<StepId, { title: string; subtitle?: string }> = {
  kind: { title: 'O que você vai organizar?', subtitle: 'Escolha o que mais combina. Dá para mudar depois.' },
  sport: { title: 'Qual esporte?', subtitle: 'Não achou o seu? Escreva o nome e use como esporte novo.' },
  when: { title: 'Quando vai ser?' },
  where: { title: 'Onde vai ser?', subtitle: 'Escolha o lugar na busca: quem reservar recebe o caminho no Google Maps ou no Waze.' },
  spots: { title: 'Quantas vagas e quanto custa?' },
  name: { title: 'Como vai se chamar?', subtitle: 'Sugerimos um nome com o que você escolheu. Ajuste se quiser.' },
};

interface SessionWizardProps {
  mode: 'create' | 'edit';
  /** Atividade de partida (editar ou repetir) */
  initial?: SessionValues;
  /** Abrir direto num passo (repetir e voltar do cadastro abrem na revisão) */
  startAt?: Screen;
  /** Recado no topo da revisão */
  banner?: string;
  /** Criar do zero: oferece continuar o rascunho guardado */
  offerDraft?: boolean;
  /** Já tem gente inscrita: tipo e preço não mudam */
  hasParticipants?: boolean;
  /** Para avisar os inscritos se dia, horário ou local mudarem */
  original?: { title: string; date: string; start_time: string; location_name: string; participants: number };
  hadSportOther?: boolean;
  isOrganizer: boolean;
  onSubmit: (data: Omit<TablesInsert<'sessions'>, 'professional_id'>) => Promise<void>;
  onExit: () => void;
  isSubmitting: boolean;
}

/** Criar ou editar atividade: uma pergunta por tela, revisão no fim. */
export function SessionWizard({
  mode,
  initial,
  startAt = 'kind',
  banner,
  offerDraft = false,
  hasParticipants = false,
  original,
  hadSportOther = false,
  isOrganizer,
  onSubmit,
  onExit,
  isSubmitting,
}: SessionWizardProps) {
  const editing = mode === 'edit';
  const [draft] = useState(() => (offerDraft ? readDraft() : null));
  const [askResume, setAskResume] = useState(() => offerDraft && draftHasContent(draft));
  const [values, setValues] = useState<SessionValues>(() => initial ?? emptyValues());
  const [screen, setScreen] = useState<Screen>(startAt);
  // veio da revisão para alterar uma resposta: "Continuar" volta para a revisão
  const [backToReview, setBackToReview] = useState(startAt === 'review');
  const { data: categories } = useCategories();
  // "agora" da abertura da tela (checa horário que já passou)
  const [now] = useState(nowSP);

  const update = (patch: Partial<SessionValues>) => setValues((prev) => ({ ...prev, ...patch }));
  const category = categories?.find((c) => c.id === values.category_id);
  const sportName = values.sport_other ?? category?.name ?? '';

  // rascunho: só na criação, guardado com o passo em que a pessoa está
  useEffect(() => {
    if (editing || askResume) return;
    const t = setTimeout(() => writeDraft({ values, step: screen }), 400);
    return () => clearTimeout(t);
  }, [values, screen, editing, askResume]);

  const go = (next: Screen) => {
    // primeira vez no nome: já vem com a sugestão
    if (next === 'name' && !values.title.trim()) {
      const suggestion = suggestActivityTitle({ kind: values.kind, sport: sportName, date: values.date, time: values.start_time });
      if (suggestion) update({ title: suggestion });
    }
    setScreen(next);
    window.scrollTo({ top: 0 });
  };

  if (askResume && draft) {
    const d = draft.values;
    const draftSport = d.sport_other ?? categories?.find((c) => c.id === d.category_id)?.name;
    return (
      <StepFlow
        label="Nova atividade"
        progress={{ step: 0, total: STEPS.length }}
        caption="Rascunho"
        title="Você tem uma atividade começada"
        subtitle="Ela ficou guardada neste aparelho."
        onBack={onExit}
        primary={{
          label: 'Continuar de onde parei',
          onClick: () => {
            setValues(d);
            setScreen(draft.step);
            setBackToReview(draft.step === 'review');
            setAskResume(false);
          },
        }}
      >
        <div className="bg-surface border border-line rounded-2xl p-4 flex items-start gap-3">
          <FilePen className="w-5 h-5 text-brand shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate">{d.title.trim() || draftSport || 'Atividade sem nome'}</p>
            <p className="text-xs text-ink-muted mt-0.5 first-letter:uppercase">
              {[draftSport, d.date && format(parseISO(d.date), "EEEE, d 'de' MMM", { locale: ptBR }), d.location_name].filter(Boolean).join(' · ') || 'Começou há pouco'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setValues(emptyValues());
            setScreen('kind');
            setAskResume(false);
          }}
          className="w-full h-12 rounded-xl border border-line text-sm font-semibold text-ink flex items-center justify-center gap-2 active:bg-surface"
        >
          <RotateCcw className="w-4 h-4" /> Começar do zero
        </button>
      </StepFlow>
    );
  }

  const label = editing ? 'Editar atividade' : 'Nova atividade';

  if (screen === 'review') {
    const missingStep = firstMissingStep(values, now, { editing });
    const logisticsChanged =
      editing && !!original && original.participants > 0 &&
      (original.date !== values.date || original.start_time.slice(0, 5) !== values.start_time.slice(0, 5) || original.location_name !== values.location_name);

    const submit = async () => {
      if (missingStep) {
        toast.error(stepMissing(missingStep, values, now, { editing }) ?? 'Falta um dado.');
        go(missingStep);
        setBackToReview(true);
        return;
      }
      // guarda o rascunho já na revisão: se precisar do cadastro de organizador, volta aqui
      if (!editing) writeDraft({ values, step: 'review' });
      await onSubmit(toSessionInsert(values, { editing, hadSportOther }));
    };

    const notify = () => {
      const when = format(parseISO(values.date), "EEEE, d 'de' MMMM", { locale: ptBR });
      const text = `Oi, pessoal! A atividade "${values.title.trim()}" mudou: agora é ${when}, às ${values.start_time}, em ${values.location_name}. Qualquer dúvida, me chamem.`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
      <StepFlow
        label={label}
        title={editing ? 'Confira as mudanças' : 'Confira e publique'}
        subtitle={editing ? undefined : 'É assim que a atividade vai aparecer para quem for reservar.'}
        stepKey="review"
        onBack={() => (editing ? onExit() : go('name'))}
        primary={{ label: editing ? 'Salvar alterações' : 'Publicar atividade', onClick: () => void submit(), loading: isSubmitting }}
        hint={editing ? 'Quem já reservou continua com a vaga.' : 'Depois de publicar, você manda o convite.'}
      >
        {banner && <p className="rounded-2xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm text-ink">{banner}</p>}
        <ReviewStep
          v={values}
          sportName={sportName}
          sportSlug={category?.slug}
          onEdit={(s) => {
            setBackToReview(true);
            go(s);
          }}
        />
        {logisticsChanged && (
          <section className="rounded-2xl border border-accent/40 bg-accent/10 p-4 space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <AlertTriangle className="w-4 h-4 text-accent" /> Avise quem já reservou
            </p>
            <p className="text-xs text-ink-muted">
              Você mudou dia, horário ou local de uma atividade com {original?.participants} inscrito{original?.participants === 1 ? '' : 's'}.
            </p>
            <button type="button" onClick={notify} className="w-full h-11 rounded-xl bg-success/15 text-success font-semibold text-sm flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> Avisar no WhatsApp
            </button>
          </section>
        )}
      </StepFlow>
    );
  }

  const index = STEPS.indexOf(screen);
  const missing = stepMissing(screen, values, now, { editing });
  const next = () => {
    if (missing) return;
    if (backToReview || index === STEPS.length - 1) go('review');
    else go(STEPS[index + 1]);
  };
  const back = () => {
    if (backToReview) go('review');
    else if (index === 0) onExit();
    else go(STEPS[index - 1]);
  };

  return (
    <StepFlow
      label={label}
      progress={{ step: index + 1, total: STEPS.length }}
      title={COPY[screen].title}
      subtitle={COPY[screen].subtitle}
      stepKey={screen}
      onBack={back}
      primary={{ label: backToReview ? 'Voltar para a revisão' : index === STEPS.length - 1 ? 'Revisar' : 'Continuar', onClick: next, disabled: !!missing }}
      hint={missing ?? undefined}
    >
      {screen === 'kind' && <KindStep v={values} update={update} locked={hasParticipants} />}
      {screen === 'sport' && <SportStep v={values} update={update} />}
      {screen === 'when' && <WhenStep v={values} update={update} />}
      {screen === 'where' && <WhereStep v={values} update={update} />}
      {screen === 'spots' && <SpotsStep v={values} update={update} priceLocked={hasParticipants} isOrganizer={isOrganizer} />}
      {screen === 'name' && <NameStep v={values} update={update} sportName={sportName} />}
    </StepFlow>
  );
}
