import type { LegalDocument } from './documents';

/**
 * Documentos legais do Riff Clubes.
 *
 * Atenção: texto-base escrito para deixar claro o papel de cada parte. PRECISA de
 * revisão jurídica antes do lançamento, em especial o termo do responsável
 * (dados de menores, LGPD art. 14). Os trechos entre [colchetes] precisam ser
 * preenchidos com os dados da empresa.
 *
 * Mudou o texto? Suba a versão em LEGAL_VERSIONS (documents.ts).
 */

export type ClubesLegalDocumentId = 'clubes_terms' | 'clubes_privacy' | 'guardian_consent';

const COMPANY = '[Razão social], inscrita no CNPJ sob o nº [CNPJ]';
const CONTACT = '[E-MAIL DE CONTATO]';

export const CLUBES_LEGAL_DOCUMENTS: Record<ClubesLegalDocumentId, LegalDocument> = {
  clubes_terms: {
    id: 'clubes_terms',
    path: '/termos',
    title: 'Termos de Uso',
    summary:
      'O Riff Clubes é uma ferramenta para condomínios e clubes organizarem as atividades esportivas dos seus membros. Quem organiza cada atividade e cuida do espaço é o condomínio ou clube.',
    sections: [
      {
        heading: '1. O que é o Riff Clubes',
        paragraphs: [
          `O Riff Clubes é um aplicativo mantido por ${COMPANY} ("Riff"). Ele permite que condomínios e clubes ("comunidades") publiquem atividades esportivas para os seus membros, que se inscrevem pelo app.`,
          'O Riff não organiza, não realiza, não supervisiona e não garante nenhuma atividade. O Riff não administra os espaços das comunidades nem responde pelos instrutores que elas convidam.',
        ],
      },
      {
        heading: '2. Sua conta e a comunidade',
        paragraphs: [
          'Para ter uma conta você precisa ter 18 anos ou mais, informar dados verdadeiros e manter sua senha em segredo. A conta é pessoal e intransferível, e é a mesma usada no Riff Pro.',
          'Você entra numa comunidade por convite do gestor dela. O gestor pode mudar seu papel (membro, instrutor ou gestor) ou remover você da comunidade; nesse caso, suas inscrições futuras ali são canceladas.',
        ],
      },
      {
        heading: '3. Atividades e inscrições',
        paragraphs: [
          'A inscrição pelo app não tem custo. Eventuais valores cobrados pelo condomínio ou clube são combinados fora do app, diretamente com eles.',
          'Regras de uso do espaço, horários, cancelamentos e presença são definidos pela comunidade. Cancelamentos pelo app só são aceitos até 4 horas antes do início; depois disso, avise quem conduz a atividade.',
        ],
      },
      {
        heading: '4. Menores de idade',
        paragraphs: [
          'Menores de 18 anos não têm conta. Eles participam como dependentes, cadastrados pelo responsável legal, que aceita o Termo do Responsável e responde pelas inscrições que faz.',
          'Menores só podem ser inscritos em atividades que a comunidade marcou como abertas a menores, dentro da área do condomínio ou clube. O Riff recomenda que menores sejam acompanhados por um adulto responsável.',
        ],
      },
      {
        heading: '5. Responsabilidade pelas atividades',
        paragraphs: [
          'Cada atividade é de responsabilidade da comunidade que a publica e de quem a conduz: realização, segurança do espaço, equipamentos, supervisão, habilitação profissional exigida por lei e cumprimento das informações divulgadas.',
          'Ao participar, você declara estar em condições de saúde adequadas à prática e conhecer os riscos próprios da atividade física e esportiva. Recomendamos avaliação médica antes de iniciar qualquer atividade física.',
          'Dentro do que a lei permite, o Riff não responde por danos decorrentes das atividades nem da conduta de comunidades, instrutores ou membros. Nada nestes termos afasta direitos que a lei garante de forma irrenunciável.',
        ],
      },
      {
        heading: '6. Conduta',
        paragraphs: [
          'É proibido usar o app para conteúdo falso, ilegal, ofensivo ou discriminatório, ou para contatar pessoas de forma abusiva. O Riff pode suspender ou encerrar contas que violem estes termos.',
        ],
      },
      {
        heading: '7. Mudanças nestes termos',
        paragraphs: [
          'Podemos atualizar estes termos. Quando isso acontecer, você verá a nova versão e precisará aceitá-la para continuar usando o app.',
        ],
      },
    ],
  },

  clubes_privacy: {
    id: 'clubes_privacy',
    path: '/privacidade',
    title: 'Política de Privacidade',
    summary:
      'Quais dados o Riff Clubes usa, inclusive de dependentes menores de idade, para quê, quem vê e como você exerce seus direitos (LGPD).',
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
          'Cadastro: nome, e-mail, telefone e foto. Comunidade: de quais condomínios ou clubes você participa e seu papel em cada um.',
          'Uso do app: inscrições, presença e resultados das atividades. Dados técnicos: registros de acesso e informações do dispositivo e navegador.',
          'Dependentes menores de idade: apenas nome, data de nascimento e parentesco, informados pelo responsável. Não pedimos dados de saúde nem documentos de menores.',
        ],
      },
      {
        heading: '3. Para que usamos e com qual base legal',
        paragraphs: [
          'Para prestar o serviço: criar a conta, mostrar a agenda da comunidade, fazer e cancelar inscrições e registrar presença (execução de contrato, LGPD art. 7º, V).',
          'Dados de menores são tratados no melhor interesse deles, com o consentimento específico do responsável (LGPD art. 14, §1º), só para inscrevê-los em atividades da comunidade.',
          'Para segurança, prevenção de fraudes e melhoria do app (legítimo interesse, art. 7º, IX) e para cumprir obrigações legais (art. 7º, II).',
        ],
      },
      {
        heading: '4. Quem vê seus dados',
        paragraphs: [
          'O gestor da comunidade vê quem é membro e quem se inscreveu nas atividades dela. Quem conduz uma atividade vê os inscritos daquela atividade. Os outros membros não veem as inscrições de ninguém.',
          'O nome e a idade de um dependente só aparecem para quem conduz e para o gestor da atividade em que ele está inscrito.',
          'Prestadores de serviço que operam a infraestrutura do app (hospedagem e banco de dados) podem armazenar dados fora do Brasil, com as garantias exigidas pela LGPD (art. 33). Também compartilhamos com autoridades quando a lei exigir. Não vendemos dados.',
        ],
      },
      {
        heading: '5. Por quanto tempo',
        paragraphs: [
          'Enquanto sua conta estiver ativa. Ao remover um dependente, o nome e a data de nascimento dele são apagados na hora; fica só o registro anônimo de presença. Ao excluir a conta, seus dados pessoais são apagados ou anonimizados, exceto o necessário para obrigações legais e para os aceites destes documentos.',
        ],
      },
      {
        heading: '6. Seus direitos',
        paragraphs: [
          'Você pode pedir acesso, correção, portabilidade, informação sobre compartilhamentos e exclusão dos seus dados e dos dados dos seus dependentes (LGPD art. 18). Dependentes podem ser removidos direto no app. Para os demais pedidos: ' + CONTACT + '.',
        ],
      },
    ],
  },

  guardian_consent: {
    id: 'guardian_consent',
    path: '/termo-responsavel',
    title: 'Termo do Responsável',
    summary:
      'Para cadastrar um menor de idade como dependente, você declara ser o responsável legal por ele e autoriza o uso dos dados mínimos necessários para inscrevê-lo nas atividades da comunidade.',
    sections: [
      {
        heading: '1. Declaração',
        paragraphs: [
          'Declaro que sou pai, mãe ou responsável legal pelo menor que estou cadastrando e que as informações dele (nome, data de nascimento e parentesco) são verdadeiras.',
        ],
      },
      {
        heading: '2. Consentimento (LGPD art. 14)',
        paragraphs: [
          'Autorizo o Riff a tratar esses dados com a única finalidade de inscrever o menor em atividades das comunidades das quais faço parte e registrar a presença dele.',
          'Esses dados só ficam visíveis para mim e, quando o menor estiver inscrito numa atividade, para quem a conduz e para o gestor da comunidade.',
          'Posso revogar este consentimento a qualquer momento removendo o dependente no app. Isso apaga o nome e a data de nascimento dele e cancela as inscrições futuras.',
        ],
      },
      {
        heading: '3. Responsabilidade e supervisão',
        paragraphs: [
          'Sou responsável pelas inscrições que faço em nome do menor e por avaliar se a atividade é adequada para ele, inclusive quanto às condições de saúde.',
          'O Riff recomenda que o menor seja acompanhado por um adulto responsável durante as atividades. A realização e a segurança das atividades e do espaço são de responsabilidade do condomínio ou clube e de quem conduz a atividade. O Riff não supervisiona as atividades.',
        ],
      },
    ],
  },
};

export const clubesLegalDocumentByPath = (path: string) =>
  Object.values(CLUBES_LEGAL_DOCUMENTS).find((doc) => doc.path === path);
