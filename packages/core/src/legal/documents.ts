/**
 * Documentos legais do Riff Pro.
 *
 * Atenção: texto-base escrito para deixar claro o papel de cada parte. PRECISA de
 * revisão jurídica antes do lançamento. Os trechos entre [colchetes] precisam ser
 * preenchidos com os dados da empresa.
 *
 * Mudou o texto de um documento? Suba a versão dele: todo mundo terá de aceitar
 * de novo na próxima vez que abrir o app.
 */

import type { ClubesLegalDocumentId } from './clubes';

export type ProLegalDocumentId = 'terms' | 'privacy' | 'organizer_terms';
/** Documentos do Riff Pro e do Riff Clubes (textos do Clubes em clubes.ts). */
export type LegalDocumentId = ProLegalDocumentId | ClubesLegalDocumentId;

export const LEGAL_VERSIONS: Record<LegalDocumentId, string> = {
  terms: '2026-10-01',
  privacy: '2026-10-06',
  organizer_terms: '2026-10-01',
  clubes_terms: '2026-10-06',
  clubes_privacy: '2026-10-06',
  guardian_consent: '2026-10-03',
};

export interface LegalDocument {
  id: LegalDocumentId;
  path: string;
  title: string;
  summary: string;
  sections: { heading: string; paragraphs: string[] }[];
}

const COMPANY = '[Razão social], inscrita no CNPJ sob o nº [CNPJ]';
const CONTACT = '[E-MAIL DE CONTATO]';

export const LEGAL_DOCUMENTS: Record<ProLegalDocumentId, LegalDocument> = {
  terms: {
    id: 'terms',
    path: '/termos',
    title: 'Termos de Uso',
    summary:
      'O Riff Pro é uma vitrine que conecta organizadores e participantes. Quem organiza a atividade é o responsável por ela, pelo pagamento, pelo cancelamento e pelo reembolso.',
    sections: [
      {
        heading: '1. O que é o Riff Pro',
        paragraphs: [
          `O Riff Pro é um aplicativo mantido por ${COMPANY} ("Riff"). Ele é uma ferramenta de tecnologia que permite a organizadores (educadores físicos, organizadores de eventos, jogos e campeonatos) divulgar atividades e a participantes encontrá-las e reservar vagas.`,
          'O Riff não organiza, não realiza, não supervisiona e não garante nenhuma atividade publicada no app. O Riff não é empregador, sócio, representante ou intermediário financeiro dos organizadores.',
        ],
      },
      {
        heading: '2. Sua conta',
        paragraphs: [
          'Para usar o Riff Pro você precisa ter 18 anos ou mais, informar dados verdadeiros e manter sua senha em segredo. A conta é pessoal e intransferível; você responde pelo que for feito com ela.',
        ],
      },
      {
        heading: '3. Pagamentos, cancelamentos e reembolsos',
        paragraphs: [
          'O pagamento de uma atividade é feito diretamente ao organizador (por exemplo, via Pix para a chave dele). O Riff não recebe, não guarda, não repassa e não devolve valores.',
          'Preço, regras de cancelamento, remarcação e reembolso são definidos e cumpridos pelo organizador de cada atividade. Qualquer pedido de reembolso deve ser feito diretamente a ele.',
          'Uma vaga paga fica pré-reservada até o organizador confirmar o pagamento.',
        ],
      },
      {
        heading: '4. Responsabilidade pelas atividades',
        paragraphs: [
          'Cada atividade é de responsabilidade exclusiva de quem a organiza: realização, local, segurança, equipamentos, autorizações, habilitação profissional exigida por lei, seguros e cumprimento das informações divulgadas.',
          'Ao participar, você declara estar em condições de saúde adequadas à prática, conhecer os riscos próprios da atividade física e esportiva e seguir as orientações do organizador. Recomendamos avaliação médica antes de iniciar qualquer atividade física.',
          'Dentro do que a lei permite, o Riff não responde por danos decorrentes das atividades, da conduta de organizadores ou participantes, nem de pagamentos feitos entre eles. Nada nestes termos afasta direitos que a lei garante de forma irrenunciável.',
        ],
      },
      {
        heading: '5. Conduta e conteúdo',
        paragraphs: [
          'É proibido publicar conteúdo falso, ilegal, ofensivo ou discriminatório, usar o app para fraudes ou para contatar pessoas de forma abusiva. O Riff pode remover conteúdos e suspender ou encerrar contas que violem estes termos.',
          'Avaliações e comentários expressam a opinião de quem os escreveu.',
        ],
      },
      {
        heading: '6. Mudanças nestes termos',
        paragraphs: [
          'Podemos atualizar estes termos. Quando isso acontecer, você verá a nova versão e precisará aceitá-la para continuar usando o app.',
        ],
      },
      {
        heading: '7. Lei aplicável e contato',
        paragraphs: [
          'Estes termos seguem a lei brasileira. Fica eleito o foro do domicílio do usuário quando ele for consumidor.',
          `Dúvidas: ${CONTACT}.`,
        ],
      },
    ],
  },

  organizer_terms: {
    id: 'organizer_terms',
    path: '/termos-organizador',
    title: 'Termo do Organizador',
    summary:
      'Ao publicar atividades, você é o único responsável por elas, pelos participantes enquanto estiverem na atividade e por pagamentos, cancelamentos e reembolsos.',
    sections: [
      {
        heading: '1. Você é o responsável pela atividade',
        paragraphs: [
          'Ao publicar uma atividade no Riff Pro, você declara que é o único e integral responsável por ela: organização, execução, local, segurança e integridade dos participantes durante a atividade, equipamentos, autorizações e licenças, habilitação profissional exigida por lei (por exemplo, registro no CREF quando aplicável) e eventuais seguros.',
          'O Riff apenas disponibiliza a tecnologia para divulgação e reservas. Não há vínculo de emprego, sociedade ou representação entre você e o Riff.',
        ],
      },
      {
        heading: '2. Preço, pagamento e reembolso',
        paragraphs: [
          'Você define o preço e recebe o pagamento diretamente dos participantes. Cabe a você informar com clareza as regras de cancelamento e reembolso e cumpri-las, inclusive devolvendo valores quando for o caso.',
          'Você é responsável pelas obrigações fiscais sobre o que recebe, como a emissão de nota fiscal quando exigida.',
        ],
      },
      {
        heading: '3. Informações verdadeiras e atualizadas',
        paragraphs: [
          'As informações das atividades (data, horário, local, vagas, nível, o que levar) devem ser verdadeiras. Se algo mudar ou a atividade for cancelada, você deve atualizar no app e avisar os participantes.',
        ],
      },
      {
        heading: '4. Dados dos participantes',
        paragraphs: [
          'Os dados dos participantes que você acessa pelo app servem apenas para realizar a atividade. Você se compromete a tratá-los conforme a Lei Geral de Proteção de Dados (LGPD) e a não usá-los para outros fins sem consentimento.',
        ],
      },
      {
        heading: '5. Reclamações',
        paragraphs: [
          'Reclamações, pedidos de reembolso ou de indenização relacionados às suas atividades devem ser resolvidos por você. Se o Riff for acionado por fato decorrente de atividade sua, você se compromete a ressarcir o Riff pelos valores que ele vier a suportar, na forma da lei.',
          'O Riff pode remover atividades e suspender contas que violem este termo ou os Termos de Uso.',
        ],
      },
    ],
  },

  privacy: {
    id: 'privacy',
    path: '/privacidade',
    title: 'Política de Privacidade',
    summary: 'Quais dados o Riff Pro usa, para quê, com quem compartilha e como você exerce seus direitos (LGPD).',
    sections: [
      {
        heading: '1. Quem trata seus dados',
        paragraphs: [
          `O controlador dos dados é ${COMPANY}. Encarregado de proteção de dados (DPO): [NOME DO ENCARREGADO], ${CONTACT}.`,
        ],
      },
      {
        heading: '2. Quais dados usamos',
        paragraphs: [
          'Cadastro: nome, e-mail, telefone, cidade, foto e bio. Organizadores: também chave Pix, WhatsApp e registro profissional, quando informados.',
          'Uso do app: reservas, presença, avaliações, resultados de atividades e locais. Dados técnicos: registros de acesso e informações do dispositivo e navegador.',
          'Perfil esportista: a partir das suas presenças calculamos jogos, frequência, esportes, locais, organizadores e conquistas. Só você vê esses números.',
        ],
      },
      {
        heading: '3. Para que usamos e com qual base legal',
        paragraphs: [
          'Para prestar o serviço que você contratou: criar a conta, publicar e reservar atividades, permitir o pagamento direto ao organizador (execução de contrato, LGPD art. 7º, V).',
          'Para segurança, prevenção de fraudes e melhoria do app (legítimo interesse, art. 7º, IX), para cumprir obrigações legais (art. 7º, II) e para nos defender em processos (exercício regular de direitos, art. 7º, VI).',
        ],
      },
      {
        heading: '4. Com quem compartilhamos',
        paragraphs: [
          'Com o organizador da atividade que você reserva, na medida necessária (por exemplo, seu nome). Com o participante que reserva sua atividade, os dados necessários para o pagamento (por exemplo, sua chave Pix e WhatsApp).',
          'Com quem também reservou a mesma atividade: sua foto e seu primeiro nome com a inicial do sobrenome (por exemplo, "Marina L."), na lista de quem vai. Quem não reservou vê só a quantidade de confirmados. Com o modo reservado, no seu perfil, você aparece só como "Participante".',
          'Com prestadores de serviço que operam a infraestrutura do app (hospedagem e banco de dados), que podem armazenar dados fora do Brasil com as garantias exigidas pela LGPD (art. 33). Com autoridades, quando a lei exigir.',
          'Não vendemos seus dados.',
        ],
      },
      {
        heading: '5. Por quanto tempo',
        paragraphs: [
          'Enquanto sua conta estiver ativa. Ao excluir a conta, seus dados pessoais são apagados ou anonimizados; mantemos apenas o necessário para cumprir obrigações legais e para exercício de direitos, como registros de reservas e pagamentos e os aceites destes documentos.',
        ],
      },
      {
        heading: '6. Seus direitos',
        paragraphs: [
          'Você pode pedir acesso, correção, portabilidade, informação sobre compartilhamentos e exclusão dos seus dados (LGPD art. 18). A exclusão pode ser feita direto no app, em Perfil > Excluir Minha Conta. Para os demais pedidos: ' + CONTACT + '.',
        ],
      },
      {
        heading: '7. Segurança e idade mínima',
        paragraphs: [
          'Usamos controles de acesso e criptografia em trânsito para proteger seus dados. O Riff Pro é destinado a maiores de 18 anos.',
        ],
      },
    ],
  },
};

export const legalDocumentByPath = (path: string) =>
  Object.values(LEGAL_DOCUMENTS).find((doc) => doc.path === path);
