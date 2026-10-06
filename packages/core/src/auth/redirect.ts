/** Só aceita voltar para uma tela do próprio app ("/algo"), nunca para outro site. */
export const safeRedirect = (redirect: string | null, fallback: string) =>
  redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : fallback;
