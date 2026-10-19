/**
 * Endereço da página do organizador a partir do nome ("Rodrigo Rigo da Fonseca" → "rodrigo-fonseca"):
 * primeiro e último nome, sem acento, só letras, números e hífen. Sem isso, a página usava o id
 * (riff-pro.vercel.app/@3e5a4…), feio para pôr na bio.
 */
export function slugFromName(name?: string | null): string {
  const words = (name ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return '';
  const picked = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return picked.join('-').replace(/-+/g, '-').slice(0, 40);
}

/** Alternativas quando o endereço já tem dono: base, base-2, base-3… */
export const slugCandidates = (base: string, count = 6) => (base ? [base, ...Array.from({ length: count - 1 }, (_, i) => `${base}-${i + 2}`)] : []);
