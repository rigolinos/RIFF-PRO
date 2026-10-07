// Busca de endereços do Riff Pro (Geoapify, dados do OpenStreetMap).
// O plano permite guardar a coordenada; a chave é pública e travada por domínio
// no painel do Geoapify (VITE_GEOAPIFY_KEY).
const KEY = import.meta.env.VITE_GEOAPIFY_KEY as string | undefined;

export const geoSearchEnabled = !!KEY;

export type FoundPlace = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  latitude: number;
  longitude: number;
};

type GeoapifyResult = {
  place_id?: string;
  name?: string;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  town?: string;
  village?: string;
  lat: number;
  lon: number;
};

/** Sugestões para o texto digitado (só Brasil, em português) */
export async function searchPlaces(text: string, signal: AbortSignal, near?: { latitude: number; longitude: number } | null): Promise<FoundPlace[]> {
  if (!KEY || text.trim().length < 3) return [];
  const params = new URLSearchParams({
    text: text.trim(),
    filter: 'countrycode:br',
    lang: 'pt',
    limit: '5',
    format: 'json',
    apiKey: KEY,
  });
  if (near) params.set('bias', `proximity:${near.longitude},${near.latitude}`);
  const res = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`, { signal });
  if (!res.ok) throw new Error(`geoapify ${res.status}`);
  const data = (await res.json()) as { results?: GeoapifyResult[] };
  return (data.results ?? []).map((r, i) => {
    const name = r.name || r.address_line1 || r.formatted || 'Local';
    const rest = r.name ? r.formatted?.replace(`${r.name}, `, '') : r.address_line2;
    return {
      id: r.place_id ?? `${r.lat},${r.lon},${i}`,
      name,
      address: rest || r.formatted || '',
      city: r.city || r.town || r.village || null,
      latitude: Number(r.lat.toFixed(7)),
      longitude: Number(r.lon.toFixed(7)),
    };
  });
}
