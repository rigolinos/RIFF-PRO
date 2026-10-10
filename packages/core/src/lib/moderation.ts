/** Denunciar e bloquear: textos e tipos comuns ao Riff Pro e ao Riff Clubes */

export type ReportKind = 'profile' | 'session' | 'review';
export type ReportReason = 'offensive' | 'harassment' | 'fraud' | 'spam' | 'safety' | 'minor' | 'other';

/** Os motivos têm de ser os mesmos aceitos pela função report_content no banco */
export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'offensive', label: 'Conteúdo ofensivo ou discriminatório' },
  { value: 'harassment', label: 'Assédio ou ameaça' },
  { value: 'fraud', label: 'Golpe ou informação falsa' },
  { value: 'safety', label: 'Risco à segurança' },
  { value: 'minor', label: 'Envolve menor de idade' },
  { value: 'spam', label: 'Propaganda ou spam' },
  { value: 'other', label: 'Outro motivo' },
];

export const REPORT_TITLES: Record<ReportKind, string> = {
  profile: 'Denunciar perfil',
  session: 'Denunciar atividade',
  review: 'Denunciar avaliação',
};

const MODERATION_ERRORS: Record<string, string> = {
  unauthenticated: 'Entre na sua conta para continuar.',
  own_content: 'Este conteúdo é seu.',
  own_profile: 'Este perfil é o seu.',
  not_found: 'Não encontramos este conteúdo. Ele pode ter sido removido.',
  too_many: 'Você chegou ao limite por hoje. Tente de novo amanhã.',
  invalid_reason: 'Escolha um motivo.',
};

/** Mensagem para a pessoa a partir do erro devolvido pelas funções de denúncia e bloqueio */
export function moderationError(error: unknown, fallback: string): string {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  const code = Object.keys(MODERATION_ERRORS).find((key) => message.includes(key));
  return code ? MODERATION_ERRORS[code] : fallback;
}
