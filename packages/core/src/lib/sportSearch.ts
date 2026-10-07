/** Texto sem acento e em minúsculas (mesma ideia do public.plain_text do banco) */
export const plainText = (t: string) => t.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim();

// Apelidos e grafias comuns por esporte (categories.slug): "tennis" acha Tênis, "bjj" acha Jiu-Jitsu
const ALIASES: Record<string, string[]> = {
  tenis: ['tennis'],
  'beach-tennis': ['beach tenis', 'tenis de praia', 'bt'],
  'tenis-mesa': ['ping pong', 'pingpong', 'table tennis', 'tenis de mesa'],
  pickleball: ['pickle'],
  padel: ['paddle', 'padle'],
  squash: [],
  badminton: [],
  futevolei: ['footvolley', 'futvolei', 'altinha'],
  'volei-praia': ['volei', 'volleyball', 'beach volley', 'voleibol'],
  'volei-quadra': ['volei', 'volleyball', 'voleibol', 'volei de quadra'],
  futebol: ['soccer', 'football', 'fut', 'pelada', 'society', 'campo'],
  futsal: ['futebol de salao', 'salao', 'fut salao'],
  basquete: ['basketball', 'basket', 'basquetebol'],
  handebol: ['handball'],
  rugby: [],
  ultimate: ['frisbee', 'disco'],
  'jiu-jitsu': ['bjj', 'jiujitsu', 'jiu jitsu', 'jj'],
  'muay-thai': ['muaythai', 'thai'],
  boxe: ['boxing', 'box'],
  karate: [],
  judo: [],
  capoeira: [],
  lutas: ['luta', 'mma', 'artes marciais', 'kickboxing'],
  natacao: ['swim', 'swimming', 'piscina'],
  corrida: ['running', 'run', 'corrida de rua', 'cooper'],
  atletismo: ['track', 'pista'],
  triatlo: ['triathlon', 'triatlon'],
  ciclismo: ['bike', 'bicicleta', 'pedal', 'mtb', 'cycling', 'speed'],
  'trilha-caminhada': ['trilha', 'hiking', 'caminhada', 'trekking'],
  escalada: ['climbing', 'boulder', 'bouldering'],
  'remo-canoagem': ['remo', 'canoa', 'canoagem', 'caiaque', 'kayak', 'rowing', 'va a'],
  surf: ['surfe', 'bodyboard'],
  sup: ['stand up', 'paddle board', 'stand up paddle'],
  kitesurf: ['kite'],
  musculacao: ['academia', 'gym', 'treino', 'peso'],
  funcional: ['treino funcional'],
  crossfit: ['cross', 'cross training', 'crosstraining'],
  hiit: [],
  calistenia: ['calisthenics', 'barra'],
  yoga: ['ioga'],
  pilates: [],
  meditacao: ['mindfulness'],
  alongamento: ['stretching', 'mobilidade'],
  danca: ['dance', 'zumba', 'ballet', 'bale', 'forro', 'samba', 'salsa'],
  patinacao: ['patins', 'roller', 'patinete'],
  skate: ['skateboard'],
  airsoft: ['air soft'],
  paintball: [],
  esports: ['games', 'videogame', 'video game', 'e sports'],
  'jogos-tabuleiro': ['xadrez', 'cartas', 'poker', 'board game', 'tabuleiro'],
};

/** O esporte bate com o que a pessoa digitou (nome, slug ou apelido, sem acento) */
export function sportMatches(c: { name: string; slug: string | null }, query: string) {
  const q = plainText(query);
  if (!q) return true;
  if (plainText(c.name).includes(q)) return true;
  if ((c.slug ?? '').replace(/-/g, ' ').includes(q)) return true;
  return (ALIASES[c.slug ?? ''] ?? []).some((a) => {
    const alias = plainText(a);
    return alias.includes(q) || (q.length >= 3 && q.includes(alias) && alias.length >= 3);
  });
}

