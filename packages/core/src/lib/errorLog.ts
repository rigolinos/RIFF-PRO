import { supabase } from '@riff/core/supabase/client';

/**
 * Registro de erros das telas no nosso próprio banco (função log_client_error).
 * Só de quem está logado. Nunca lança erro: registrar um erro não pode causar outro.
 * A equipe Riff consulta com admin_client_errors() pelo terminal.
 */

type App = 'pro' | 'clubes';

const MAX_PER_VISIT = 10;
const sent = new Set<string>();
let app: App | null = null;

/** Texto do erro para o registro. Exportado para teste. */
export function describeError(error: unknown): { message: string; stack: string | null } {
  if (error instanceof Error) return { message: `${error.name}: ${error.message}`, stack: error.stack ?? null };
  if (typeof error === 'string') return { message: error, stack: null };
  if (error && typeof error === 'object' && 'message' in error) return { message: String(error.message), stack: null };
  return { message: 'Erro desconhecido', stack: null };
}

export function reportError(error: unknown, extraStack?: string | null): void {
  try {
    if (!app || !import.meta.env.PROD) return;
    const { message, stack } = describeError(error);
    // o mesmo erro só vai uma vez por visita, e poucos por visita
    if (sent.has(message) || sent.size >= MAX_PER_VISIT) return;
    sent.add(message);
    const currentApp = app;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!data.session) return;
        return supabase.rpc('log_client_error', {
          p_app: currentApp,
          p_message: message,
          p_stack: [stack, extraStack].filter(Boolean).join('\n') || undefined,
          p_route: window.location.pathname,
          p_user_agent: navigator.userAgent,
        });
      })
      .then(undefined, () => undefined);
  } catch {
    // sem registro; o app segue
  }
}

/** Liga o registro para erros não tratados. Chamar uma vez, no main.tsx de cada app. */
export function installErrorLog(product: App): void {
  app = product;
  window.addEventListener('error', (event) => reportError(event.error ?? event.message));
  window.addEventListener('unhandledrejection', (event) => reportError(event.reason));
}
