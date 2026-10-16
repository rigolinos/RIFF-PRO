import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@riff/core/ui/drawer';
import { Button } from '@riff/core/ui/button';
import { Input } from '@riff/core/ui/input';
import { SportIcon } from '@riff/core/domain';
import { KINDS, type ActivityKind } from '@riff/core/lib/copy';
import { chipClass } from '@riff/core/lib/chips';
import { cn } from '@riff/core/lib/utils';
import { sportMatches } from '@riff/core/lib/sportSearch';

export type PriceFilter = 'all' | 'free' | 'paid';
export type FeedFilterState = { kind: ActivityKind | 'all'; sport: string | 'all'; price: PriceFilter };
type Category = { id: string; name: string; slug: string | null };

const PRICE_LABEL: Record<PriceFilter, string> = { all: 'Qualquer preço', free: 'Grátis', paid: 'Pagas' };

/**
 * Filtros do Início: um botão "Filtrar" que abre a gaveta (tipo, esporte, preço) e, quando há
 * filtro ligado, os chips para tirar cada um. Antes eram duas faixas com dezenas de chips antes da lista.
 */
export function FeedFilters({
  value,
  onChange,
  categories,
  resultCount,
}: {
  value: FeedFilterState;
  onChange: (next: FeedFilterState) => void;
  categories: Category[];
  resultCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const sportName = categories.find((c) => c.id === value.sport)?.name;
  const active = [
    value.kind !== 'all' && { key: 'kind', label: KINDS[value.kind as ActivityKind].chip, clear: () => onChange({ ...value, kind: 'all' }) },
    value.sport !== 'all' && sportName && { key: 'sport', label: sportName, clear: () => onChange({ ...value, sport: 'all' }) },
    value.price !== 'all' && { key: 'price', label: PRICE_LABEL[value.price], clear: () => onChange({ ...value, price: 'all' }) },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];
  const sports = categories.filter((c) => sportMatches(c, search));

  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar px-4 pt-5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(chipClass(active.length > 0), 'shrink-0 inline-flex items-center gap-1.5')}
          aria-haspopup="dialog"
        >
          <SlidersHorizontal className="w-4 h-4" /> Filtrar{active.length ? ` · ${active.length}` : ''}
        </button>
        {active.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={f.clear}
            aria-label={`Tirar o filtro ${f.label}`}
            className="shrink-0 h-9 px-3 rounded-full bg-brand/10 border border-brand/40 text-sm font-medium text-ink inline-flex items-center gap-1.5"
          >
            {f.label} <X className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-bg border-line">
          <div className="mx-auto w-full max-w-[480px] px-5 pb-6 max-h-[80dvh] overflow-y-auto">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle className="type-title">Filtrar atividades</DrawerTitle>
            </DrawerHeader>

            <section className="space-y-2">
              <p className="type-label">Tipo</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={value.kind === 'all'} onClick={() => onChange({ ...value, kind: 'all' })} className={chipClass(value.kind === 'all')}>
                  Todos
                </button>
                {(Object.keys(KINDS) as ActivityKind[]).map((k) => (
                  <button key={k} type="button" aria-pressed={value.kind === k} onClick={() => onChange({ ...value, kind: k })} className={chipClass(value.kind === k)}>
                    {KINDS[k].chip}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2 pt-5">
              <p className="type-label">Preço</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PRICE_LABEL) as PriceFilter[]).map((p) => (
                  <button key={p} type="button" aria-pressed={value.price === p} onClick={() => onChange({ ...value, price: p })} className={chipClass(value.price === p)}>
                    {PRICE_LABEL[p]}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2 pt-5">
              <p className="type-label">Esporte</p>
              <div className="relative">
                <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar esporte" aria-label="Buscar esporte" className="h-11 pl-9 bg-surface border-line" />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={value.sport === 'all'} onClick={() => onChange({ ...value, sport: 'all' })} className={chipClass(value.sport === 'all')}>
                  Todos
                </button>
                {sports.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={value.sport === c.id}
                    onClick={() => onChange({ ...value, sport: c.id })}
                    className={cn(chipClass(value.sport === c.id), 'inline-flex items-center gap-1.5')}
                  >
                    <SportIcon slug={c.slug} className="w-4 h-4" /> {c.name}
                  </button>
                ))}
              </div>
            </section>

            <div className="sticky bottom-0 bg-bg pt-5 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => onChange({ kind: 'all', sport: 'all', price: 'all' })} disabled={active.length === 0}>
                Limpar
              </Button>
              <Button className="flex-1" onClick={() => setOpen(false)}>
                Ver {resultCount} atividade{resultCount === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
