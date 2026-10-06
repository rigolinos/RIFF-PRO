/** Só os dígitos */
export const digits = (value: string) => value.replace(/\D/g, '');

/** CPF ou CNPJ válido pelos dígitos verificadores (mesma regra do banco: public.tax_id_kind) */
export function taxIdKind(value: string): 'cpf' | 'cnpj' | null {
  const v = digits(value);
  const d = v.split('').map(Number);
  const check = (len: number, weights: number[]) => {
    const s = weights.reduce((acc, w, i) => acc + d[i] * w, 0);
    return len === 11 ? ((s * 10) % 11) % 10 : s % 11 < 2 ? 0 : 11 - (s % 11);
  };
  if (v.length === 11 && !/^(\d)\1{10}$/.test(v)) {
    const ok1 = check(11, [10, 9, 8, 7, 6, 5, 4, 3, 2]) === d[9];
    const ok2 = check(11, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) === d[10];
    return ok1 && ok2 ? 'cpf' : null;
  }
  if (v.length === 14 && !/^(\d)\1{13}$/.test(v)) {
    const ok1 = check(14, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === d[12];
    const ok2 = check(14, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === d[13];
    return ok1 && ok2 ? 'cnpj' : null;
  }
  return null;
}

/** Máscara enquanto digita: 000.000.000-00 ou 00.000.000/0000-00 */
export function maskTaxId(value: string) {
  const v = digits(value).slice(0, 14);
  if (v.length <= 11) {
    return v.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
  }
  return v
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/** Máscara de celular: (00) 00000-0000 */
export function maskPhone(value: string) {
  const v = digits(value).slice(0, 11);
  if (v.length <= 2) return v.length ? `(${v}` : '';
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
}

/** Tem 18 anos ou mais na data de hoje (AAAA-MM-DD) */
export function isAdult(birthDate: string, today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return false;
  const [y, m, d] = today.split('-').map(Number);
  const limit = `${y - 18}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return birthDate <= limit && birthDate >= '1900-01-01';
}
