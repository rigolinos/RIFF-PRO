/** Mensagens do Supabase Auth (em inglês) traduzidas para quem usa o app. */
export function authErrorMessage(error: { message?: string; status?: number } | null | undefined, fallback: string) {
  const msg = (error?.message ?? '').toLowerCase();
  if (error?.status === 429 || msg.includes('rate limit') || msg.includes('only request this after'))
    return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
  if (msg.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('email not confirmed')) return 'Falta confirmar o e-mail. Abra o link que enviamos para a sua caixa de entrada.';
  if (msg.includes('user already registered') || msg.includes('already been registered'))
    return 'Já existe uma conta com este e-mail. Entre com ela ou recupere a senha.';
  if (msg.includes('password should be at least')) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (msg.includes('password should contain')) return 'A senha precisa ter letras e números (e, se pedido, letras maiúsculas e minúsculas).';
  if (msg.includes('weak') && msg.includes('password')) return 'Essa senha é fraca ou já apareceu em vazamentos. Escolha outra.';
  if (msg.includes('should be different from the old password')) return 'A nova senha precisa ser diferente da anterior.';
  if (msg.includes('unable to validate email') || msg.includes('invalid format')) return 'Confira o e-mail digitado.';
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'Sem conexão. Confira a internet e tente de novo.';
  // mensagens próprias (já em português) passam direto
  if (error?.message && !/^[a-z0-9 .,'-]+$/i.test(error.message)) return error.message;
  return fallback;
}
