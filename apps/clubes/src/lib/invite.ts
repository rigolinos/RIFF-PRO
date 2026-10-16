/**
 * Convite por link (/convite/XXXX-XXXX): o código fica guardado neste aparelho enquanto a
 * pessoa cria a conta, confirma o e-mail e aceita os termos; no Início, ela entra sozinha
 * no grupo. Antes, o código ficava no WhatsApp e a pessoa tinha de voltar lá para copiar.
 */
/** XXXXXXXX → XXXX-XXXX (o join_organization aceita com ou sem hífen). */
export const formatInviteCode = (code: string) => {
  const raw = code.replace(/-/g, '');
  return raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : code;
};

const KEY = 'riff-invite-code';
const VALID_MS = 7 * 24 * 60 * 60 * 1000;

/** Só letras e números, em maiúsculas, no formato XXXX-XXXX (o banco aceita com ou sem hífen) */
export function normalizeInviteCode(code: string): string {
  const raw = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
}

export const isInviteCode = (code: string) => /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizeInviteCode(code));

export const inviteLink = (code: string, origin = window.location.origin) => `${origin}/convite/${normalizeInviteCode(code)}`;

export function storeInviteCode(code: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ code: normalizeInviteCode(code), at: Date.now() }));
  } catch {
    // sem armazenamento: a pessoa digita o código depois
  }
}

export function readInviteCode(now = Date.now()): string | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null') as { code?: string; at?: number } | null;
    if (!saved?.code || !saved.at || now - saved.at > VALID_MS) return null;
    return saved.code;
  } catch {
    return null;
  }
}

export function clearInviteCode() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada a limpar
  }
}
