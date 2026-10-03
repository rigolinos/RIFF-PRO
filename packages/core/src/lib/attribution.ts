/**
 * De onde veio a reserva ("registrar tudo").
 *
 * Guarda a PRIMEIRA entrada da visita (aba) — por exemplo, chegou em /@felipe vindo do
 * Instagram — e, na hora de reservar, decide o canal. Quem entra pelo link de um
 * organizador e reserva uma atividade dele conta como organizer_link, mesmo que passe
 * pelo login antes.
 */

export type BookingScreen = 'feed' | 'explore' | 'profile' | 'session';
export type BookingSource = 'organizer_link' | 'activity_link' | 'feed' | 'explore' | 'direct' | 'other';

interface Landing {
  path: string;
  params: Record<string, string>;
  referrerHost?: string;
}

const KEY = 'riff-landing';
const TRACKED_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref'];

function readLanding(): Landing | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Landing) : null;
  } catch {
    return null;
  }
}

/** Chamado uma vez ao abrir o app; não sobrescreve a primeira entrada da aba. */
export function captureLanding() {
  try {
    if (sessionStorage.getItem(KEY)) return;
    const url = new URL(window.location.href);
    const params: Record<string, string> = {};
    for (const key of TRACKED_PARAMS) {
      const value = url.searchParams.get(key);
      if (value) params[key] = value.slice(0, 200);
    }
    let referrerHost: string | undefined;
    if (document.referrer) {
      const host = new URL(document.referrer).host;
      if (host && host !== window.location.host) referrerHost = host;
    }
    const landing: Landing = { path: url.pathname, params, referrerHost };
    sessionStorage.setItem(KEY, JSON.stringify(landing));
  } catch {
    // sem armazenamento (aba anônima etc.): a reserva só fica sem origem
  }
}

// /@felipe, /felipe (rota :handle) ou /pro/felipe -> "felipe"
function organizerHandle(path: string): string | null {
  const pro = path.match(/^\/pro\/([^/]+)/);
  if (pro) return decodeURIComponent(pro[1]).toLowerCase();
  const at = path.match(/^\/@([^/]+)/) ?? path.match(/^\/%40([^/]+)/i);
  return at ? decodeURIComponent(at[1]).toLowerCase() : null;
}

export function bookingAttribution(
  screen: BookingScreen,
  session: { id: string; professional?: { id: string; public_slug: string | null } | null },
): { source: BookingSource; attribution: Record<string, string> } {
  const landing = readLanding();
  const attribution: Record<string, string> = { ...(landing?.params ?? {}) };
  if (landing?.referrerHost) attribution.referrer_host = landing.referrerHost;
  if (landing?.path) attribution.landing_path = landing.path.slice(0, 200);

  const handle = landing ? organizerHandle(landing.path) : null;
  const pro = session.professional;
  const sameOrganizer = !!handle && !!pro && (handle === pro.public_slug?.toLowerCase() || handle === pro.id);
  if (sameOrganizer) return { source: 'organizer_link', attribution };
  if (landing?.path === `/session/${session.id}`) return { source: 'activity_link', attribution };

  const byScreen: Record<BookingScreen, BookingSource> = {
    feed: 'feed',
    explore: 'explore',
    profile: 'explore',
    session: 'other',
  };
  return { source: byScreen[screen], attribution };
}
