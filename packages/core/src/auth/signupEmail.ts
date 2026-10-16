const KEY = 'riff-signup-email';

/** Guarda o e-mail do cadastro só durante esta visita (para a tela de confirmação sobreviver a um recarregar) */
export function rememberSignupEmail(email: string) {
  try {
    sessionStorage.setItem(KEY, email.trim().toLowerCase());
  } catch {
    // sem armazenamento: a tela só não mostra o e-mail
  }
}

export function readSignupEmail(): string {
  try {
    return sessionStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}
