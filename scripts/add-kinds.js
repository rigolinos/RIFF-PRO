import fs from 'fs';
let content = fs.readFileSync('src/lib/copy.ts', 'utf-8');

const kindsMap = `
export type ActivityKind = 'class' | 'match' | 'tournament' | 'event' | 'other';

export const KINDS: Record<ActivityKind, {
  label: string;
  chip: string;
  description: string;
  example: string;
  icon: string;
  titlePlaceholder: string;
  capacityLabel: string;
  capacityHint?: string;
  descriptionPlaceholder: string;
  defaultDuration: number;
}> = {
  class: {
    label: 'Aula ou treino',
    chip: 'Aula',
    description: 'Você conduz e ensina: pilates, yoga, funcional. Costuma se repetir toda semana.',
    example: 'Pilates, yoga, funcional, futebol para iniciantes',
    icon: 'GraduationCap',
    titlePlaceholder: 'Ex: Pilates para iniciantes',
    capacityLabel: 'Vagas',
    descriptionPlaceholder: 'O que a pessoa vai aprender e o que precisa levar (roupa, tapete, água).',
    defaultDuration: 60,
  },
  match: {
    label: 'Jogo ou partida',
    chip: 'Jogo',
    description: 'Você junta gente para jogar: um racha, vôlei, uma partida de airsoft. O foco é fechar as vagas.',
    example: 'Racha de futsal, vôlei de areia, airsoft',
    icon: 'Users',
    titlePlaceholder: 'Ex: Racha de futsal de quinta',
    capacityLabel: 'Total de jogadores',
    capacityHint: 'Conte todos os jogadores, incluindo você se for jogar.',
    descriptionPlaceholder: 'Regras, nível do pessoal, o que levar (chuteira, colete, equipamento).',
    defaultDuration: 90,
  },
  tournament: {
    label: 'Campeonato ou torneio',
    chip: 'Campeonato',
    description: 'Vários jogos ou equipes, com inscrição e data de início. Por enquanto o Riff cuida das inscrições e das vagas; a tabela de jogos você organiza por fora.',
    example: 'Copa de bairro, torneio de tênis, campeonato de vôlei',
    icon: 'Trophy',
    titlePlaceholder: 'Ex: Copa Vila Nova de Futsal',
    capacityLabel: 'Limite de inscritos ou equipes',
    descriptionPlaceholder: 'Formato, regras, premiação e prazo das inscrições.',
    defaultDuration: 240,
  },
  event: {
    label: 'Evento ou encontro',
    chip: 'Evento',
    description: 'Algo pontual e mais aberto: corrida em grupo, workshop, aula aberta, confraternização.',
    example: 'Corrida em grupo, workshop, aula aberta',
    icon: 'CalendarDays',
    titlePlaceholder: 'Ex: Corrida do Parque, edição de outubro',
    capacityLabel: 'Limite de participantes',
    descriptionPlaceholder: 'Programação, ponto de encontro e o que levar.',
    defaultDuration: 120,
  },
  other: {
    label: 'Outro',
    chip: 'Atividade',
    description: 'Não achou o seu? Descreva no título e na descrição que a gente ajusta.',
    example: '',
    icon: 'Sparkles',
    titlePlaceholder: 'Ex: Nome da sua atividade',
    capacityLabel: 'Vagas',
    descriptionPlaceholder: 'Conte o que é, para quem é e o que levar.',
    defaultDuration: 60,
  },
};
`;

if (!content.includes('export const KINDS')) {
    content += "\n" + kindsMap;
    fs.writeFileSync('src/lib/copy.ts', content);
}
