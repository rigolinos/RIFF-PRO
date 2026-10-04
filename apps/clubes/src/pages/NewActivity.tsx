import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
import { Textarea } from '@riff/core/ui/textarea';
import { Switch } from '@riff/core/ui/switch';
import { KINDS, type ActivityKind } from '@riff/core/lib/copy';
import { errorMessage } from '@riff/core/lib/utils';
import { useCommunity, todaySP } from '@/hooks/useCommunity';

const FIELD = 'h-12 bg-surface border-line';
const SELECT =
  'w-full h-12 rounded-md bg-surface border border-line px-3 text-ink focus:outline-none focus:border-brand/50';

export default function NewActivity() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { data: community, isLoading } = useCommunity(orgId);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, emoji')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });

  // Locais já usados pela comunidade (quadra, piscina, salão…)
  const { data: venues } = useQuery({
    queryKey: ['community-venues', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('venues').select('id, name').eq('organization_id', orgId!).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const [kind, setKind] = useState<ActivityKind>('class');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(String(KINDS.class.defaultDuration));
  const [place, setPlace] = useState('');
  const [spots, setSpots] = useState('10');
  const [description, setDescription] = useState('');
  const [minorsAllowed, setMinorsAllowed] = useState(false);
  const [minAge, setMinAge] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isLoading && community && !community.canManage) return <Navigate to={`/c/${orgId}`} replace />;
  if (!isLoading && community === null) return <Navigate to="/inicio" replace />;

  const missing = !title.trim()
    ? 'Dê um título para a atividade.'
    : !categoryId
      ? 'Escolha a modalidade.'
      : !date
        ? 'Escolha a data.'
        : !time
          ? 'Escolha o horário.'
          : !place.trim()
            ? 'Informe o local.'
            : !(Number(spots) >= 1)
              ? 'Informe quantas vagas a atividade tem.'
              : minorsAllowed && minAge !== '' && !(Number(minAge) >= 0 && Number(minAge) <= 17)
                ? 'A idade mínima vai de 0 a 17 anos.'
                : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (missing) {
      toast.error(missing);
      return;
    }
    if (!profile?.id || !orgId) return;
    setIsSaving(true);
    try {
      // product = 'clubes' é definido pelo banco (atividade ligada a condomínio ou clube)
      const { error } = await supabase.from('sessions').insert({
        professional_id: profile.id,
        organization_id: orgId,
        category_id: categoryId,
        kind,
        title: title.trim(),
        description: description.trim() || null,
        date,
        start_time: time,
        duration_minutes: Number(duration) || KINDS[kind].defaultDuration,
        location_name: place.trim(),
        max_participants: Number(spots),
        price_per_slot: 0,
        status: 'active',
        minors_allowed: minorsAllowed,
        min_age: minorsAllowed && minAge !== '' ? Number(minAge) : null,
      });
      if (error) throw error;
      toast.success('Atividade publicada para a comunidade!');
      queryClient.invalidateQueries({ queryKey: ['community-agenda', orgId] });
      queryClient.invalidateQueries({ queryKey: ['community-venues', orgId] });
      navigate(`/c/${orgId}`);
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Não foi possível publicar a atividade.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageContainer title="Nova atividade" showBack withBottomNav={false}>
      <form onSubmit={handleSave} className="px-6 py-6 space-y-5 pb-24">
        {community && <p className="type-label">Para os membros de {community.name}</p>}

        <div className="space-y-2">
          <span className="text-sm font-medium text-ink">O que você vai organizar?</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(KINDS) as ActivityKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  setDuration(String(KINDS[k].defaultDuration));
                }}
                className={`h-9 px-3 rounded-full text-sm font-medium border transition-colors ${
                  kind === k ? 'bg-brand text-brand-ink border-brand' : 'bg-surface border-line text-ink-muted'
                }`}
              >
                {KINDS[k].chip}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-ink">Título</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={KINDS[kind].titlePlaceholder} className={FIELD} />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-ink">Modalidade</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={SELECT}>
            <option value="">Selecione…</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink">Data</span>
            <Input type="date" min={todaySP()} value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink">Horário</span>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={FIELD} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink">Duração (min)</span>
            <Input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(e.target.value)} className={FIELD} />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink">{KINDS[kind].capacityLabel}</span>
            <Input type="number" min={1} value={spots} onChange={(e) => setSpots(e.target.value)} className={FIELD} />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-ink">Local no condomínio ou clube</span>
          <Input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Ex: Quadra poliesportiva" className={FIELD} />
          {venues && venues.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {venues.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setPlace(v.name)}
                  className={`h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
                    place === v.name ? 'bg-brand text-brand-ink border-brand' : 'bg-surface border-line text-ink-muted'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-ink">Descrição (opcional)</span>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={KINDS[kind].descriptionPlaceholder}
            className="h-24 bg-surface border-line resize-none"
          />
        </label>

        <div className="space-y-3 bg-surface border border-line rounded-xl p-4">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm font-medium text-ink">Aceita menores de idade</span>
            <Switch checked={minorsAllowed} onCheckedChange={setMinorsAllowed} />
          </label>
          <p className="text-xs text-ink-muted">
            Menores entram como dependentes, inscritos pelo responsável. Recomende o acompanhamento de um adulto.
          </p>
          {minorsAllowed && (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink">Idade mínima (opcional)</span>
              <Input type="number" min={0} max={17} value={minAge} onChange={(e) => setMinAge(e.target.value)} placeholder="Ex: 8" className={FIELD} />
            </label>
          )}
        </div>

        <p className="text-xs text-ink-muted">
          Só os membros desta comunidade veem e se inscrevem. A inscrição é gratuita.
        </p>

        <Button type="submit" size="lg" className="w-full" disabled={isSaving}>
          {isSaving ? 'Publicando…' : 'Publicar atividade'}
        </Button>
      </form>
    </PageContainer>
  );
}
