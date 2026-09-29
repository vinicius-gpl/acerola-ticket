import { type TicketInsert } from '../../../server/src/lib/db/schema/tickets.schema';
import { between, chance, pick, pickWeighted, timeRuler } from '../volume.util';

/**
 * OS CHAMADOS EM VOLUME — o que faz os gráficos desta tela poderem ser julgados.
 *
 * Os vinte e dois escritos à mão continuam existindo e cobrem os limites: o chamado sem
 * máquina, o cancelado, o que repete quatro vezes na mesma pessoa. O que falta a eles é
 * QUANTIDADE — com vinte e dois, o radar de tipos sai com barrinhas de 1 e 2, o tempo médio
 * de resolução é a média de quatro números, e "quem mais pediu socorro" é um empate geral.
 *
 * Nada aqui sorteia: ver `volume.util`. Os ids começam em 100, para nunca colidirem com os
 * escritos à mão — e porque o id é o protocolo que aparece na tela (`CH-0100`).
 */
const ATTENDANT = 'suporte@azuos.local';

const { workdayAgo } = timeRuler();

/** O primeiro id dos chamados gerados. Abaixo disto são os escritos à mão. */
const FIRST_GENERATED_TICKET_ID = 100;

/**
 * Quantos chamados, e em quantos dias.
 *
 * Noventa dias porque é o maior recorte que o painel oferece: com menos, escolher "últimos 90
 * dias" mostraria exatamente o mesmo que "últimos 30", e o seletor de período pareceria
 * quebrado.
 */
const GENERATED_TICKETS = 260;
const SPREAD_DAYS = 90;

/**
 * Os tipos EM ORDEM DE FREQUÊNCIA — os primeiros saem muito mais (ver `pickWeighted`).
 *
 * Um escritório de contabilidade reclama de impressora e de lentidão o tempo todo, e de
 * acesso remoto quase nunca. Numa escolha plana os nove tipos empatariam, o gráfico sairia
 * com nove barras iguais e não haveria "o que mais dá problema" — que é a única pergunta que
 * aquela tela faz.
 */
const PROBLEM_TYPES = [
  'printer',
  'slow_computer',
  'network',
  'email',
  'digital_certificate',
  'internal_system',
  'software_install',
  'remote_access',
  'other',
] as const;

/** Os departamentos, também em ordem de quem mais abre chamado. */
const DEPARTMENTS = [
  'contabil',
  'fiscal',
  'financeiro',
  'paralegal',
  'recepcao',
  'pessoal',
  'rh',
  'comercial',
  'cs',
  'analyze',
  'certificado',
] as const;

const PEOPLE = [
  'Ana Ribeiro',
  'Bruno Tavares',
  'Camila Nunes',
  'Diego Farias',
  'Elisa Moretti',
  'Fábio Andrade',
  'Gabriela Pinto',
  'Heitor Barbosa',
  'Iara Lemos',
  'João Vicente',
  'Karina Duarte',
  'Lucas Peixoto',
  'Marina Bastos',
  'Nelson Aguiar',
  'Olívia Camargo',
  'Paulo Rezende',
] as const;

/** O que a pessoa escreveu, por tipo de problema. Texto de tela: português. */
const DESCRIPTIONS: Record<(typeof PROBLEM_TYPES)[number], readonly string[]> = {
  printer: [
    'A impressora não puxa papel e trava no meio da folha.',
    'Sai tudo borrado depois da troca do toner.',
    'A impressora sumiu da lista de impressoras do meu computador.',
  ],
  slow_computer: [
    'O computador demora uns dez minutos para abrir qualquer coisa.',
    'Trava toda vez que abro a planilha de fechamento.',
    'Está lento desde a atualização da semana passada.',
  ],
  network: [
    'A internet cai de cinco em cinco minutos.',
    'Não consigo acessar a pasta compartilhada do servidor.',
    'O wi-fi da sala não aparece mais.',
  ],
  email: [
    'Parei de receber e-mail desde ontem de manhã.',
    'A caixa de entrada diz que está cheia e não deixa enviar.',
    'Os anexos não abrem, dá erro de arquivo corrompido.',
  ],
  digital_certificate: [
    'O certificado digital não é reconhecido pelo site do tribunal.',
    'Pede a senha do certificado e recusa a que eu sempre uso.',
    'O leitor de cartão não acende quando conecto.',
  ],
  internal_system: [
    'O sistema fecha sozinho na hora de emitir a guia.',
    'Dá erro ao salvar o lançamento e perde tudo que eu digitei.',
    'A tela de relatórios fica carregando para sempre.',
  ],
  software_install: [
    'Preciso do leitor de PDF instalado nesta máquina.',
    'Preciso do programa da prefeitura para emitir nota.',
    'Instalaram o programa errado, preciso da versão nova.',
  ],
  remote_access: [
    'O AnyDesk não conecta, fica dizendo aguardando conexão.',
    'Preciso de acesso remoto para trabalhar de casa amanhã.',
    'O acesso remoto cai toda vez que a tela bloqueia.',
  ],
  other: [
    'O monitor fica piscando de vez em quando.',
    'O teclado está com três teclas que não respondem.',
    'A cadeira não é problema de TI, mas o telefone da mesa está mudo.',
  ],
};

/** O que o TI escreveu ao resolver. */
const SOLUTIONS = [
  'Resolvido em atendimento remoto.',
  'Troquei o cabo e testei com a pessoa.',
  'Reinstalei o programa e conferi o acesso.',
  'Limpei a fila de impressão e reiniciei o serviço.',
  'Liberei espaço no disco e reiniciei a máquina.',
  'Reconfigurei a conta e validei o envio.',
] as const;

/**
 * Uma máquina do inventário para o chamado apontar — ou NENHUMA.
 *
 * O campo é opcional de propósito, e um pedaço dos chamados fica sem vínculo: é o caso comum
 * de quem abre pelo formulário público, sem saber em que máquina estava. Se todos tivessem
 * máquina, a coluna "Máquina" da lista nunca mostraria o traço, e a recorrência por máquina
 * pareceria cobrir o parque inteiro.
 */
function computerOf(position: number): number | null {
  if (chance(28, position * 3)) return null;

  /* Dois terços caem no parque gerado (ids 100+) e um terço nas oito escritas à mão: é o que
     dá conteúdo às duas pontas sem concentrar tudo numa só. */
  return chance(66, position * 5) ? between(100, 141, position * 7) : between(1, 8, position * 7);
}

function statusOf(position: number) {
  if (chance(58, position * 11)) return 'resolved' as const;
  if (chance(24, position * 13)) return 'in_progress' as const;
  if (chance(6, position * 17)) return 'cancelled' as const;

  return 'open' as const;
}

function generate(index: number): TicketInsert {
  const id = FIRST_GENERATED_TICKET_ID + index;
  const problemType = pickWeighted(PROBLEM_TYPES, index);
  const department = pickWeighted(DEPARTMENTS, index * 3 + 1);
  const requesterName = pick(PEOPLE, index * 7 + 2);
  const status = statusOf(index);

  const openedDaysAgo = between(0, SPREAD_DAYS, index * 19);
  const createdAt = workdayAgo(openedDaysAgo, index);

  /* O atendimento leva de dez minutos a dois dias: é o que dá um tempo médio de resolução
     que não é nem instantâneo nem absurdo, e o que faz o indicador do painel variar com o
     período escolhido. */
  const startedMinutes = between(10, 480, index * 23);
  const resolvedMinutes = startedMinutes + between(15, 2400, index * 29);

  const isDone = status === 'resolved' || status === 'cancelled';
  const startedAt =
    status === 'open' ? null : new Date(createdAt.getTime() + startedMinutes * 60 * 1000);
  const resolvedAt = isDone ? new Date(createdAt.getTime() + resolvedMinutes * 60 * 1000) : null;

  return {
    id,
    status,
    priority: pickWeighted(['medium', 'low', 'high'] as const, index * 31),
    requesterName,
    department,
    problemType,
    computerId: computerOf(index),
    anydeskId: chance(22, index * 37) ? `${between(100, 999, index)} ${between(100, 999, index + 1)} ${between(100, 999, index + 2)}` : null,
    /* O prefixo 99999 não existe como número atribuído: nenhum telefone daqui toca em lugar
       nenhum, e este arquivo vai para o git para sempre. */
    contactPhone: `6299999${String(1000 + (index % 900)).slice(0, 4)}`,
    notifyWhatsapp: chance(45, index * 41),
    description: pick(DESCRIPTIONS[problemType], index * 43),
    assignee: status === 'open' ? null : 'Suporte TI',
    solution: status === 'resolved' ? pick(SOLUTIONS, index * 47) : null,
    createdAt,
    startedAt,
    resolvedAt,
    updatedAt: isDone ? resolvedAt : startedAt,
    updatedBy: status === 'open' ? null : ATTENDANT,
  };
}

const SPREAD_TICKETS: TicketInsert[] = Array.from({ length: GENERATED_TICKETS }, (_value, index) =>
  generate(index),
);

/**
 * OS CASOS QUE SE REPETEM — o bloco de recorrência do painel só existe por causa deles.
 *
 * A geração espalhada acima não produz recorrência por acidente: com dezesseis pessoas, nove
 * tipos e noventa dias, quase ninguém acumula três chamados do MESMO tipo dentro do MESMO
 * mês — e o bloco nasce com uma barra só, que é como ele estava.
 *
 * Aqui os padrões são escritos de propósito, porque é isso que o bloco existe para mostrar:
 * a pessoa que abre quatro de impressora é alguém que ninguém treinou, e a máquina que abre
 * cinco de lentidão é equipamento para trocar. Sem eles, a tela não tem o que apontar.
 */
const RECURRING_PATTERNS = [
  { requesterName: 'Camila Nunes', department: 'contabil', problemType: 'printer', computerId: 103, count: 5 },
  { requesterName: 'Nelson Aguiar', department: 'fiscal', problemType: 'slow_computer', computerId: 107, count: 4 },
  { requesterName: 'Iara Lemos', department: 'paralegal', problemType: 'digital_certificate', computerId: 112, count: 4 },
  { requesterName: 'Lucas Peixoto', department: 'financeiro', problemType: 'network', computerId: 118, count: 3 },
  { requesterName: 'Gabriela Pinto', department: 'rh', problemType: 'email', computerId: 124, count: 3 },
  { requesterName: 'Paulo Rezende', department: 'recepcao', problemType: 'printer', computerId: 131, count: 3 },
] as const;

/** Onde os chamados de recorrência começam a numerar — depois dos espalhados. */
const FIRST_RECURRING_TICKET_ID = FIRST_GENERATED_TICKET_ID + GENERATED_TICKETS;

/**
 * Um dia DENTRO DO MÊS CORRENTE.
 *
 * Aqui a data não pode ser "há N dias": o bloco pergunta "o que se repetiu NESTE mês", e uma
 * repetição que atravessa a virada do mês não conta como repetição em nenhum dos dois.
 */
function thisMonth(dayOfMonth: number, position: number): Date {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, 9 + (position % 8), 30, 0);

  return date > now ? now : date;
}

const RECURRING_TICKETS: TicketInsert[] = RECURRING_PATTERNS.flatMap((pattern, patternIndex) =>
  Array.from({ length: pattern.count }, (_value, repetition) => {
    const position = patternIndex * 10 + repetition;
    const id = FIRST_RECURRING_TICKET_ID + position;
    /* Espalhados pelo mês, e não no mesmo dia: quatro chamados numa terça é um dia ruim;
       quatro ao longo do mês é um problema que ninguém resolveu. */
    const createdAt = thisMonth(2 + repetition * 6, position);
    const resolvedAt = new Date(createdAt.getTime() + between(40, 900, position) * 60 * 1000);

    return {
      id,
      status: 'resolved' as const,
      priority: 'medium' as const,
      requesterName: pattern.requesterName,
      department: pattern.department,
      problemType: pattern.problemType,
      computerId: pattern.computerId,
      anydeskId: null,
      contactPhone: `6299999${String(2000 + position)}`,
      notifyWhatsapp: false,
      description: pick(DESCRIPTIONS[pattern.problemType], position),
      assignee: 'Suporte TI',
      solution: pick(SOLUTIONS, position),
      createdAt,
      startedAt: new Date(createdAt.getTime() + 20 * 60 * 1000),
      resolvedAt,
      updatedAt: resolvedAt,
      updatedBy: ATTENDANT,
    };
  }),
);

export const GENERATED_TICKETS_SEED: TicketInsert[] = [...SPREAD_TICKETS, ...RECURRING_TICKETS];
