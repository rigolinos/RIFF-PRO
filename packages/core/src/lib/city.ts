const SMALL = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/** Nome de cidade como se escreve ("porto alegre" → "Porto Alegre", "rio DE janeiro" → "Rio de Janeiro"). Só para mostrar. */
export function formatCity(city?: string | null): string {
  return (city ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}