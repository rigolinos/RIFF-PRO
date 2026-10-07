import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MapPin } from 'lucide-react';
import { Input } from '@riff/core/ui/input';
import { cn } from '@riff/core/lib/utils';
import { geoSearchEnabled, searchPlaces, type FoundPlace } from '@riff/core/lib/geoapify';

interface PlaceSearchProps {
  /** Nome do local (location_name) */
  value: string;
  /** O ponto exato já está marcado (tem coordenada) */
  pinned: boolean;
  /** Digitou à mão: a coordenada anterior deixa de valer */
  onTextChange: (text: string) => void;
  onPick: (place: FoundPlace) => void;
  near?: { latitude: number; longitude: number } | null;
  placeholder?: string;
}

/** Campo de local: digita o lugar, escolhe da lista e a coordenada é gravada. Texto livre continua valendo. Usado no Pro e no Clubes. */
export function PlaceSearch({ value, pinned, onTextChange, onPick, near, placeholder = 'Busque o parque, praia, quadra ou endereço' }: PlaceSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Busca depois que a pessoa para de digitar (poupa a cota do Geoapify)
  useEffect(() => {
    if (!geoSearchEnabled || query.trim().length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      searchPlaces(query, controller.signal, near)
        .then((list) => {
          setResults(list);
          setOpen(true);
        })
        .catch(() => {
          if (!controller.signal.aborted) setResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, near]);

  const handleChange = (text: string) => {
    onTextChange(text);
    setQuery(text);
    if (text.trim().length < 3) {
      setResults([]);
      setOpen(false);
    }
  };

  const pick = (place: FoundPlace) => {
    onPick(place);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapPin className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          aria-label="Local"
          aria-autocomplete="list"
          aria-expanded={open}
          autoComplete="off"
          className="h-12 pl-9 pr-9 bg-elevated border-line"
        />
        {loading && <Loader2 className="w-4 h-4 text-ink-muted absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />}
      </div>

      {open && results.length > 0 && (
        <ul role="listbox" aria-label="Lugares encontrados" className="bg-surface border border-line rounded-xl divide-y divide-line overflow-hidden">
          {results.map((r) => (
            <li key={r.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r)}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left active:bg-elevated"
              >
                <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink truncate">{r.name}</span>
                  <span className="block text-xs text-ink-muted truncate">{r.address}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {value.trim() && (
        <p className={cn('flex items-center gap-1.5 text-xs', pinned ? 'text-success' : 'text-ink-muted')}>
          {pinned ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" /> Ponto exato marcado: o "Como chegar" leva direto até lá.
            </>
          ) : geoSearchEnabled ? (
            'Escolha um lugar da lista para marcar o ponto exato. Se não achar, pode deixar escrito.'
          ) : null}
        </p>
      )}

      {geoSearchEnabled && (
        <p className="text-xs text-ink-muted">
          Endereços:{' '}
          <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            Geoapify
          </a>{' '}
          ·{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            © OpenStreetMap
          </a>
        </p>
      )}
    </div>
  );
}
