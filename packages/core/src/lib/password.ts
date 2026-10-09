/** Regra de senha (a mesma configurada no painel do Supabase, Authentication > Email): 8+ caracteres, com letras e números. */
export const PASSWORD_MIN = 8;

/** O que falta na senha, ou null se está ok */
export function passwordProblem(p: string): string | null {
  if (p.length < PASSWORD_MIN) return `Faltam ${PASSWORD_MIN - p.length} caracteres`;
  if (!/[a-zA-Z]/.test(p)) return 'Inclua pelo menos uma letra';
  if (!/[0-9]/.test(p)) return 'Inclua pelo menos um número';
  return null;
}

export const PASSWORD_HINT = 'Mínimo de 8 caracteres, com letras e números';
