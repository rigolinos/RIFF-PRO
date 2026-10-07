import { useQuery } from '@tanstack/react-query';
import { MapPin, Navigation } from 'lucide-react';
import { supabase } from '@riff/core/supabase/client';
import { googleMapsUrl, wazeUrl } from '@riff/core/lib/geo';

/** Endereço da sede e "Como chegar" (o local só é visível para membros da comunidade) */
export function CommunityPlace({ venueId }: { venueId: string | null | undefined }) {
  const { data: venue } = useQuery({
    queryKey: ['community-sede', venueId],
    queryFn: async () => {
      const { data, error } = await supabase.from('venues').select('name, address, city, latitude, longitude').eq('id', venueId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!venueId,
    staleTime: 60 * 60 * 1000,
  });
  if (!venue?.address) return null;

  const place = { latitude: venue.latitude, longitude: venue.longitude, name: venue.name, address: [venue.address, venue.city].filter(Boolean).join(', ') };
  return (
    <div className="bg-surface border border-line rounded-2xl overflow-hidden">
      <p className="flex items-start gap-2 p-4 text-sm text-ink">
        <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
        <span className="min-w-0">{place.address}</span>
      </p>
      <div className="grid grid-cols-2 border-t border-line divide-x divide-line">
        {[
          { label: 'Google Maps', href: googleMapsUrl(place) },
          { label: 'Waze', href: wazeUrl(place) },
        ].map((a) => (
          <a
            key={a.label}
            href={a.href}
            target="_blank"
            rel="noreferrer"
            className="h-11 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand active:bg-elevated"
          >
            <Navigation className="w-4 h-4" /> {a.label}
          </a>
        ))}
      </div>
    </div>
  );
}
