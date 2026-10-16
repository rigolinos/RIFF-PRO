import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { LEGAL_CONTACT } from '@riff/core/legal/documents';

// Tem de acompanhar o que a função delete_user_account faz no banco
const REMOVED = [
  'Seu login (e-mail e senha).',
  'Nome, foto, apresentação, cidade, Instagram e registro profissional do perfil.',
  'Celular, CPF ou CNPJ, data de nascimento e chave Pix.',
  'Favoritos, notificações e o texto dos comentários que você escreveu.',
  'Nome e nascimento de dependentes cadastrados no Riff Clubes.',
  'Suas reservas e atividades futuras são canceladas, e você sai das comunidades.',
];

const KEPT = [
  'O registro de reservas, presenças e pagamentos já realizados, ligado a um perfil sem nome ("Usuário removido"), para cumprir obrigações legais e exercer direitos.',
  'A nota (estrelas) das avaliações que você deu, sem o comentário.',
  'Os aceites dos Termos de Uso e da Política de Privacidade (data e versão).',
];

interface DeleteAccountInfoProps {
  /** Nome do app (Riff Pro ou Riff Clubes) */
  appName: string;
  /** Nome do outro app que usa a mesma conta */
  otherAppName: string;
  /** Passo a passo dentro do app */
  steps: string[];
}

/** Página pública exigida pelo Google Play: como excluir a conta e o que acontece com os dados */
export function DeleteAccountInfo({ appName, otherAppName, steps }: DeleteAccountInfoProps) {
  return (
    <PageContainer title="Excluir conta" showBack withBottomNav={false}>
      <Helmet>
        <title>{`Excluir conta | ${appName}`}</title>
      </Helmet>
      <article className="px-6 py-6 space-y-6 pb-16">
        <p className="text-ink leading-relaxed bg-surface border border-line rounded-2xl p-4">
          Você pode excluir sua conta do {appName} a qualquer momento, direto no app. A exclusão vale também para o {otherAppName}: a
          conta é a mesma.
        </p>

        <section className="space-y-2">
          <h2 className="type-subtitle text-ink">Como excluir pelo app</h2>
          <ol className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
            {steps.map((step, i) => (
              <li key={step} className="flex items-start gap-3 px-4 py-3 text-sm text-ink">
                <span className="w-6 h-6 rounded-full bg-brand text-brand-ink text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-2">
          <h2 className="type-subtitle text-ink">O que é apagado</h2>
          <ul className="space-y-1.5">
            {REMOVED.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-ink-muted leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 mt-2" /> {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="type-subtitle text-ink">O que fica guardado</h2>
          <ul className="space-y-1.5">
            {KEPT.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-ink-muted leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-line shrink-0 mt-2" /> {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="type-subtitle text-ink">Não consegue entrar no app?</h2>
          <p className="text-sm text-ink-muted leading-relaxed">
            Escreva para {LEGAL_CONTACT} pelo e-mail da conta, pedindo a exclusão. Mais detalhes na{' '}
            <Link to="/privacidade" className="text-brand underline underline-offset-4">
              Política de Privacidade
            </Link>
            .
          </p>
        </section>
      </article>
    </PageContainer>
  );
}
