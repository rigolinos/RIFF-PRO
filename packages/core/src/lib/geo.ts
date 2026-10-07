/** Lugar de uma atividade: coordenada quando houver, senão o texto do endereço */
export type PlaceRef = {
  latitude?: number | string | null;
  longitude?: number | string | null;
  name?: string | null;
  address?: string | null;
};

const coords = (p: PlaceRef) => {
  const lat = p.latitude == null ? NaN : Number(p.latitude);
  const lng = p.longitude == null ? NaN : Number(p.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? `${lat},${lng}` : null;
};

const text = (p: PlaceRef) => [p.name, p.address].filter(Boolean).join(', ');

/** Rota no Google Maps (abre o app no celular) */
export function googleMapsUrl(p: PlaceRef) {
  const c = coords(p);
  return c
    ? `https://www.google.com/maps/dir/?api=1&destination=${c}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text(p))}`;
}

/** Rota no Waze */
export function wazeUrl(p: PlaceRef) {
  const c = coords(p);
  return c ? `https://waze.com/ul?ll=${c}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(text(p))}&navigate=yes`;
}

/** Tem ponto exato (coordenada) ou só o texto */
export const hasCoordinates = (p: PlaceRef) => coords(p) !== null;
