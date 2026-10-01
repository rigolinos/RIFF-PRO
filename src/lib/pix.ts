/**
 * Pix "copia e cola" (BR Code estático, padrão EMV do Banco Central).
 * É este texto que vai no QR Code: os apps de banco não leem a chave Pix crua.
 */

// Campo EMV: id (2) + tamanho (2) + valor
const field = (id: string, value: string) => `${id}${value.length.toString().padStart(2, '0')}${value}`;

// CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido no campo 63
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Nome e cidade do recebedor: só ASCII, maiúsculas, sem acento, com limite de tamanho
const sanitize = (text: string, max: number) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, max);

// Chave no formato que o Pix espera: telefone +55DDDNÚMERO, CPF/CNPJ só dígitos
export function normalizePixKey(key: string, type?: string | null): string {
  const trimmed = key.trim();
  if (type === 'phone') {
    const digits = trimmed.replace(/\D/g, '');
    return `+${digits.startsWith('55') ? digits : `55${digits}`}`;
  }
  if (type === 'cpf') return trimmed.replace(/\D/g, '');
  if (type === 'email') return trimmed.toLowerCase();
  return trimmed;
}

export function buildPixPayload(params: {
  key: string;
  keyType?: string | null;
  amount?: number;
  name?: string | null;
  city?: string | null;
}): string {
  const account = field('00', 'br.gov.bcb.pix') + field('01', normalizePixKey(params.key, params.keyType));
  const amount = params.amount && params.amount > 0 ? field('54', params.amount.toFixed(2)) : '';
  const payload =
    field('00', '01') +
    field('26', account) +
    field('52', '0000') +
    field('53', '986') +
    amount +
    field('58', 'BR') +
    field('59', sanitize(params.name || '', 25) || 'RECEBEDOR') +
    field('60', sanitize(params.city || '', 15) || 'BRASIL') +
    field('62', field('05', '***')) +
    '6304';
  return payload + crc16(payload);
}
