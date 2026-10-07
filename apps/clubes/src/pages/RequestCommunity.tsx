import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Hourglass, Minus, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { FormStep } from '@riff/core/domain';
import { PlaceSearch } from '@riff/core/domain/PlaceSearch';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
import { chipClass } from '@riff/core/lib/chips';
import { cn } from '@riff/core/lib/utils';
import type { FoundPlace } from '@riff/core/lib/geoapify';
import { requestErrorMessage, useCommunitiesNear, useCommunityRequestActions } from '@/hooks/useCommunityRequests';
import { SPACE_KINDS } from '@/lib/spaces';

const FIELD = 'h-12 bg-surface border-line';
const ROLES = [
  { value: 'sindico', label: 'Síndico(a)' },
  { value: 'administradora', label: 'Administradora' },
  { value: 'funcionario', label: 'Funcionário(a)' },
  { value: 'morador', label: 'Morador(a)' },
  { value: 'socio', label: 'Sócio(a)' },
  { value: 'outro', label: 'Outro' },
];
const INFRA = SPACE_KINDS.filter((k) => k.value !== 'other');

// Pedido de comunidade: o morador preenche, a equipe Riff fala com o condomínio e aprova
export default function RequestCommunity() {
  const navigate = useNavigate();
  const { submit, support, join } = useCommunityRequestActions();
  const [kind, setKind] = useState<'condo' | 'club'>('condo');
  const [name, setName] = useState('');
  const [placeText, setPlaceText] = useState('');
  const [place, setPlace] = useState<FoundPlace | null>(null);
  const [infra, setInfra] = useState<Record<string, number>>({});
  const [units, setUnits] = useState('');
  const [role, setRole] = useState('');
  const [contact, setContact] = useState('');
  const [sent, setSent] = useState(false);
  const { data: nearby } = useCommunitiesNear(place);

  const found = nearby?.[0] ?? null;
  const kindWord = kind === 'condo' ? 'condomínio' : 'clube';
  const missing = !name.trim()
    ? `Informe o nome do ${kindWord}.`
    : !place
      ? 'Escolha o endereço na lista.'
      : found
        ? 'Este lugar já está no Riff.'
        : !role
          ? 'Diga qual é o seu papel.'
          : null;

  const bump = (key: string, delta: number) =>
    setInfra((prev) => {
      const n = Math.max(0, Math.min(20, (prev[key] ?? 0) + delta));
      const next = { ...prev };
      if (n === 0) delete next[key];
      else next[key] = n;
      return next;
    });

  const send = async () => {
    if (missing || !place) {
      toast.error(missing ?? 'Confira os dados.');
      return;
    }
    try {
      await submit.mutateAsync({
        name: name.trim(),
        kind,
        address: place.address ? `${place.name}, ${place.address}` : place.name,
        city: place.city,
        state: null,
        latitude: place.latitude,
        longitude: place.longitude,
        infrastructure: infra,
        units: units ? Number(units) : null,
        requesterRole: role,
        sindicoContact: role === 'sindico' ? '' : contact.trim(),
      });
      setSent(true);
    } catch (error: unknown) {
      toast.error(requestErrorMessage(error, 'Não foi possível enviar o pedido.'));
    }
  };

  const act = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
    } catch (error: unknown) {
      toast.error(requestErrorMessage(error, 'Não foi possível concluir.'));
    }
  };

  if (sent) {
    return (
      <PageContainer title="Pedido enviado" showBack withBottomNav={false}>
        <div className="px-6 py-10 space-y-6 text-center">
          <span className="w-16 h-16 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </span>
          <div className="space-y-2">
            <h1 className="type-title">Recebemos o pedido do {name.trim()}</h1>
            <p className="text-sm text-ink-muted leading-relaxed">
              A equipe Riff vai falar com o {kindWord} para confirmar quem é o responsável. Quando a comunidade for aprovada, ela aparece
              aqui no app, com os espaços que você informou.
            </p>
          </div>
          <Button className="w-full" onClick={() => navigate('/comunidades', { replace: true })}>
            Ver meus pedidos
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Cadastrar meu condomínio ou clube" showBack withBottomNav={false}>
      <div className="px-6 py-6 pb-40 space-y-6">
        <p className="text-sm text-ink-muted">
          Leva 2 minutos. A equipe Riff confirma com o {kindWord} e cria a comunidade, já com a agenda e os espaços.
        </p>

        <FormStep n={1} title="O que é?">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo">
            {(['condo', 'club'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  'flex items-center gap-2 rounded-2xl border p-3 text-sm font-semibold transition-colors',
                  kind === k ? 'bg-brand/10 border-brand text-ink' : 'bg-surface border-line text-ink-muted',
                )}
              >
                {k === 'condo' ? <Building2 className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                {k === 'condo' ? 'Condomínio' : 'Clube'}
              </button>
            ))}
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder={kind === 'condo' ? 'Nome do condomínio. Ex: Residencial Aurora' : 'Nome do clube'}
            aria-label="Nome"
            className={FIELD}
          />
        </FormStep>

        <FormStep n={2} title="Onde fica?">
          <PlaceSearch
            value={placeText}
            pinned={!!place}
            placeholder="Rua e número, ou o nome do lugar"
            onTextChange={(text) => {
              setPlaceText(text);
              setPlace(null);
            }}
            onPick={(p) => {
              setPlaceText(p.address ? `${p.name}, ${p.address}` : p.name);
              setPlace(p);
            }}
          />
          {found && (
            <div className="rounded-2xl border border-brand/50 bg-brand/10 p-4 space-y-3" role="status">
              {found.type === 'community' ? (
                <>
                  <p className="text-sm text-ink">
                    <span className="font-semibold">{found.name}</span> já está no Riff.
                    {found.is_member ? ' Você já faz parte dele.' : ' Peça para entrar: o gestor recebe o pedido.'}
                  </p>
                  {!found.is_member &&
                    (found.requested ? (
                      <p className="flex items-center gap-2 text-xs text-ink-muted">
                        <Hourglass className="w-4 h-4" /> Pedido para entrar enviado. Aguarde o gestor.
                      </p>
                    ) : (
                      <Button className="w-full" disabled={join.isPending} onClick={() => act(() => join.mutateAsync(found.id), 'Pedido para entrar enviado ao gestor.')}>
                        Pedir para entrar
                      </Button>
                    ))}
                </>
              ) : (
                <>
                  <p className="text-sm text-ink">
                    <span className="font-semibold">{found.name}</span> já foi pedido e está em análise pela equipe Riff.
                  </p>
                  {found.requested ? (
                    <p className="flex items-center gap-2 text-xs text-ink-muted">
                      <CheckCircle2 className="w-4 h-4 text-success" /> Já registramos que você quer. Avisaremos quando sair.
                    </p>
                  ) : (
                    <Button className="w-full" disabled={support.isPending} onClick={() => act(() => support.mutateAsync(found.id), 'Anotado! Isso ajuda a acelerar.')}>
                      Eu também quero
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </FormStep>

        {!found && (
          <>
            <FormStep n={3} title="O que tem lá?" hint="Vira a lista de espaços da comunidade. O gestor ajusta depois.">
              <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
                {INFRA.map((k) => {
                  const n = infra[k.value] ?? 0;
                  return (
                    <li key={k.value} className="flex items-center gap-3 px-4 py-2.5">
                      <k.icon className={cn('w-5 h-5 shrink-0', n ? 'text-brand' : 'text-ink-muted')} />
                      <span className="text-sm text-ink flex-1">{k.label}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => bump(k.value, -1)}
                          disabled={!n}
                          aria-label={`Menos ${k.label}`}
                          className="w-8 h-8 rounded-full bg-elevated text-ink flex items-center justify-center disabled:opacity-30"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-5 text-center text-sm font-semibold text-ink tabular-nums">{n}</span>
                        <button
                          type="button"
                          onClick={() => bump(k.value, 1)}
                          aria-label={`Mais ${k.label}`}
                          className="w-8 h-8 rounded-full bg-elevated text-ink flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </FormStep>

            <FormStep n={4} title="Sobre você e o lugar">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder={kind === 'condo' ? 'Quantas unidades, mais ou menos? (opcional)' : 'Quantos sócios, mais ou menos? (opcional)'}
                aria-label="Unidades ou sócios"
                className={FIELD}
              />
              <p className="text-xs text-ink-muted pt-1">Qual é o seu papel?</p>
              <div className="flex flex-wrap gap-2">
                {ROLES.filter((r) => (kind === 'club' ? r.value !== 'morador' : r.value !== 'socio')).map((r) => (
                  <button key={r.value} type="button" aria-pressed={role === r.value} onClick={() => setRole(r.value)} className={chipClass(role === r.value)}>
                    {r.label}
                  </button>
                ))}
              </div>
              {role && role !== 'sindico' && (
                <Input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={120}
                  placeholder={kind === 'condo' ? 'Contato do síndico ou da administradora (opcional)' : 'Contato da diretoria (opcional)'}
                  aria-label="Contato do responsável"
                  className={FIELD}
                />
              )}
              <p className="text-xs text-ink-muted">
                Usamos esses dados só para falar com o {kindWord} sobre o Riff. Veja a{' '}
                <Link to="/privacidade" className="text-brand underline underline-offset-4">
                  Política de Privacidade
                </Link>
                .
              </p>
            </FormStep>
          </>
        )}
      </div>

      {!found && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-bg/95 backdrop-blur-xl border-t border-line px-6 py-4 pb-safe space-y-1">
          <Button size="lg" className="w-full" onClick={send} disabled={submit.isPending || !!missing}>
            {submit.isPending ? 'Enviando…' : 'Enviar pedido'}
          </Button>
          <p className="text-xs text-center text-ink-muted min-h-4">{missing ?? 'A equipe Riff responde em poucos dias.'}</p>
        </div>
      )}
    </PageContainer>
  );
}
