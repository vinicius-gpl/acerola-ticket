import { type TicketInsert } from '../../../server/src/lib/db/schema/tickets.schema';
import { GENERATED_TICKETS_SEED } from './tickets.volume';

/**
 * Os dados de teste de chamados. VERSIONADOS: toda máquina que rodar o seed vê exatamente isto.
 *
 * O `id` é fixo de propósito — é a chave que torna o seed idempotente, e é também o protocolo
 * que aparece na tela (`CH-0001`).
 *
 * Dado INVENTADO, sempre. Nome de colega, telefone de verdade, print de tela real: nada disso
 * entra aqui, porque este arquivo vai para o git e fica no histórico para sempre. Os telefones
 * usam o prefixo 99999, que não existe como número atribuído.
 */
const ATTENDANT = 'suporte@azuos.local';

/* Datas fixas: um seed com `new Date()` mudaria o tempo médio de resolução a cada execução,
   e o indicador do painel nunca poderia ser conferido de uma rodada para a outra. */
const at = (value: string) => new Date(value);


/**
 * Um dia DENTRO DO MÊS CORRENTE, contado a partir do dia 1.
 *
 * Aqui as datas NÃO podem ser fixas, ao contrário das de cima. Os blocos de recorrência do
 * painel perguntam "o que se repetiu NESTE mês": com data fixa, eles apareceriam em setembro
 * de 2026 e sumiriam em outubro, e quem rodasse o seed no mês seguinte veria a tela vazia sem
 * saber por quê. A HORA é fixa para o tempo médio de resolução não variar por execução.
 *
 * Nunca passa de agora: chamado com data no futuro não existe.
 */
function thisMonth(dayOfMonth: number, hour = 10): Date {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, hour, 0, 0);

  return date > now ? now : date;
}

const HANDWRITTEN_TICKETS: TicketInsert[] = [
  {
    id: 1,
    status: 'resolved',
    priority: 'high',
    requesterName: 'Bia Costa',
    department: 'financeiro',
    problemType: 'printer',
    anydeskId: '111 222 333',
    contactPhone: '62999990001',
    notifyWhatsapp: true,
    description: 'A impressora da sala não puxa papel e trava no meio da folha.',
    assignee: 'Suporte TI',
    solution: 'Retirei uma folha presa no rolete e limpei o tracionador.',
    createdAt: at('2026-09-15T12:10:00.000Z'),
    startedAt: at('2026-09-15T12:40:00.000Z'),
    resolvedAt: at('2026-09-15T14:10:00.000Z'),
    updatedAt: at('2026-09-15T14:10:00.000Z'),
    updatedBy: ATTENDANT,
  },
  {
    id: 2,
    status: 'open',
    priority: 'high',
    requesterName: 'Carlos Menezes',
    department: 'rh',
    problemType: 'network',
    anydeskId: null,
    contactPhone: '62999990002',
    notifyWhatsapp: true,
    description: 'A internet cai de cinco em cinco minutos desde ontem à tarde.',
    createdAt: at('2026-09-21T11:30:00.000Z'),
  },
  {
    id: 3,
    status: 'in_progress',
    priority: 'medium',
    requesterName: 'Daniela Prado',
    department: 'comercial',
    problemType: 'slow_computer',
    anydeskId: '444 555 666',
    contactPhone: '62999990003',
    notifyWhatsapp: false,
    description: 'O computador demora uns dez minutos para abrir qualquer programa.',
    assignee: 'Suporte TI',
    createdAt: at('2026-09-20T13:05:00.000Z'),
    startedAt: at('2026-09-21T12:00:00.000Z'),
    updatedAt: at('2026-09-21T12:00:00.000Z'),
    updatedBy: ATTENDANT,
  },
  {
    id: 4,
    /* Caso limite: chamado aberto por engano. Ele não some — vira cancelado, e continua no
       histórico sem entrar na média de resolução. */
    status: 'cancelled',
    priority: 'low',
    requesterName: 'Eduardo Lima',
    department: 'cs',
    problemType: 'other',
    anydeskId: null,
    contactPhone: '62999990004',
    notifyWhatsapp: false,
    description: 'Abri sem querer, pode desconsiderar.',
    assignee: 'Suporte TI',
    solution: 'Duplicado do CH-0002.',
    createdAt: at('2026-09-21T13:00:00.000Z'),
    updatedAt: at('2026-09-21T13:20:00.000Z'),
    updatedBy: ATTENDANT,
  },
  {
    id: 5,
    status: 'open',
    priority: 'medium',
    requesterName: 'Fernanda Rocha',
    department: 'fiscal',
    problemType: 'email',
    anydeskId: null,
    contactPhone: '62999990005',
    notifyWhatsapp: true,
    description: 'Não consigo enviar e-mail com anexo maior que 2 MB, dá erro de envio.',
    createdAt: at('2026-09-22T11:15:00.000Z'),
  },
  {
    id: 6,
    status: 'resolved',
    priority: 'high',
    requesterName: 'Gustavo Aires',
    department: 'contabil',
    problemType: 'digital_certificate',
    anydeskId: '777 888 999',
    contactPhone: '62999990006',
    notifyWhatsapp: false,
    description: 'O certificado digital não é reconhecido ao assinar no portal.',
    assignee: 'Suporte TI',
    solution: 'Reinstalei o driver do token e atualizei a cadeia de certificados.',
    createdAt: at('2026-09-16T11:00:00.000Z'),
    startedAt: at('2026-09-16T11:20:00.000Z'),
    resolvedAt: at('2026-09-16T12:50:00.000Z'),
    updatedAt: at('2026-09-16T12:50:00.000Z'),
    updatedBy: ATTENDANT,
  },
  {
    id: 7,
    status: 'open',
    priority: 'low',
    requesterName: 'Helena Dias',
    department: 'recepcao',
    problemType: 'remote_access',
    anydeskId: '123 456 789',
    contactPhone: '62999990007',
    notifyWhatsapp: false,
    description: 'Preciso do AnyDesk instalado no computador novo da recepção.',
    createdAt: at('2026-09-22T12:40:00.000Z'),
  },
  {
    id: 8,
    status: 'in_progress',
    priority: 'high',
    requesterName: 'Igor Fontes',
    department: 'paralegal',
    problemType: 'internal_system',
    anydeskId: null,
    contactPhone: '62999990008',
    notifyWhatsapp: true,
    description: 'O sistema interno desloga sozinho toda vez que eu salvo um processo.',
    assignee: 'Suporte TI',
    createdAt: at('2026-09-19T14:00:00.000Z'),
    startedAt: at('2026-09-22T11:00:00.000Z'),
    updatedAt: at('2026-09-22T11:00:00.000Z'),
    updatedBy: ATTENDANT,
  },
  {
    id: 9,
    /* Caso limite: descrição longa, para a lista ter que truncar sem quebrar o desenho. */
    status: 'open',
    priority: 'medium',
    requesterName: 'Joana Vilela',
    department: 'pessoal',
    problemType: 'other',
    anydeskId: null,
    contactPhone: '62999990009',
    notifyWhatsapp: false,
    description:
      'Bom dia. Desde a atualização de ontem o computador liga, mostra a tela de boas-vindas, ' +
      'fica alguns minutos carregando e só então abre a área de trabalho. Quando abre, os ícones ' +
      'demoram para aparecer e o antivírus reclama de um arquivo que não consigo ler o nome. ' +
      'Tentei reiniciar três vezes e desligar da tomada, mas continua igual. O mouse também ' +
      'trava por uns segundos de vez em quando, principalmente quando abro a planilha grande ' +
      'do fechamento. Não sei se é o mesmo problema ou se são dois.',
    createdAt: at('2026-09-22T10:20:00.000Z'),
  },
  {
    id: 10,
    status: 'resolved',
    priority: 'low',
    requesterName: 'Kleber Antunes',
    department: 'analyze',
    problemType: 'software_install',
    anydeskId: null,
    contactPhone: '62999990010',
    notifyWhatsapp: false,
    description: 'Preciso do leitor de PDF instalado para abrir os laudos.',
    assignee: 'Suporte TI',
    solution: 'Instalado e configurado como leitor padrão.',
    createdAt: at('2026-09-18T12:00:00.000Z'),
    startedAt: at('2026-09-18T12:30:00.000Z'),
    resolvedAt: at('2026-09-18T12:45:00.000Z'),
    updatedAt: at('2026-09-18T12:45:00.000Z'),
    updatedBy: ATTENDANT,
  },
  {
    id: 11,
    /* Caso limite: sem AnyDesk e sem aviso no WhatsApp — o mínimo que o formulário aceita. */
    status: 'open',
    priority: 'medium',
    requesterName: 'Lúcia Barreto',
    department: 'certificado',
    problemType: 'printer',
    anydeskId: null,
    contactPhone: '62999990011',
    notifyWhatsapp: false,
    description: 'A impressora está imprimindo tudo borrado.',
    createdAt: at('2026-09-22T09:05:00.000Z'),
  },
  {
    id: 12,
    /* Caso limite: resolvido em quinze minutos — o piso do tempo médio. */
    status: 'resolved',
    priority: 'medium',
    requesterName: 'Marcos Tavares',
    department: 'comercial',
    problemType: 'network',
    anydeskId: null,
    contactPhone: '62999990012',
    notifyWhatsapp: true,
    description: 'O cabo de rede da minha mesa não dá sinal.',
    assignee: 'Suporte TI',
    solution: 'Troquei o cabo e reorganizei a porta no switch.',
    createdAt: at('2026-09-17T13:00:00.000Z'),
    startedAt: at('2026-09-17T13:05:00.000Z'),
    resolvedAt: at('2026-09-17T13:15:00.000Z'),
    updatedAt: at('2026-09-17T13:15:00.000Z'),
    updatedBy: ATTENDANT,
  },
  /**
   * RECORRÊNCIA POR PESSOA: a mesma pessoa, o mesmo problema, quatro vezes no mês.
   *
   * É o alerta que o painel precisa acender. Quatro chamados de impressora da mesma pessoa
   * não são quatro problemas — é um problema que ninguém resolveu, e que volta na semana que
   * vem.
   */
  {
    id: 13,
    status: 'resolved',
    priority: 'medium',
    requesterName: 'Daniela Prado',
    department: 'contabil',
    problemType: 'printer',
    anydeskId: null,
    contactPhone: '62999990013',
    notifyWhatsapp: false,
    description: 'A impressora parou de puxar papel de novo.',
    assignee: 'Suporte TI',
    solution: 'Limpei o rolete.',
    createdAt: thisMonth(4),
    startedAt: thisMonth(4, 11),
    resolvedAt: thisMonth(4, 13),
    updatedAt: thisMonth(4, 13),
    updatedBy: ATTENDANT,
  },
  {
    id: 14,
    status: 'resolved',
    priority: 'medium',
    requesterName: 'Daniela Prado',
    department: 'contabil',
    problemType: 'printer',
    anydeskId: null,
    contactPhone: '62999990013',
    notifyWhatsapp: false,
    description: 'A impressora está borrando a folha inteira.',
    assignee: 'Suporte TI',
    solution: 'Troquei o toner.',
    createdAt: thisMonth(11),
    startedAt: thisMonth(11, 11),
    resolvedAt: thisMonth(11, 13),
    updatedAt: thisMonth(11, 13),
    updatedBy: ATTENDANT,
  },
  {
    id: 15,
    status: 'resolved',
    priority: 'high',
    requesterName: 'Daniela Prado',
    department: 'contabil',
    problemType: 'printer',
    anydeskId: null,
    contactPhone: '62999990013',
    notifyWhatsapp: false,
    description: 'A impressora sumiu da lista do Windows.',
    assignee: 'Suporte TI',
    solution: 'Reinstalei o driver.',
    createdAt: thisMonth(18),
    startedAt: thisMonth(18, 11),
    resolvedAt: thisMonth(18, 13),
    updatedAt: thisMonth(18, 13),
    updatedBy: ATTENDANT,
  },
  {
    id: 16,
    status: 'open',
    priority: 'high',
    requesterName: 'Daniela Prado',
    department: 'contabil',
    problemType: 'printer',
    anydeskId: null,
    contactPhone: '62999990013',
    notifyWhatsapp: true,
    description: 'De novo: travou no meio do fechamento.',
    assignee: null,
    solution: null,
    createdAt: thisMonth(25),
    startedAt: null,
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
  },

  /**
   * RECORRÊNCIA POR MÁQUINA: pessoas diferentes, a mesma máquina, o mesmo problema.
   *
   * É o que o sistema antigo não conseguia ver — lá o chamado não apontava para computador
   * nenhum. Aqui a conta aponta para a máquina, e não para quem sentou nela.
   */
  {
    id: 17,
    status: 'resolved',
    priority: 'medium',
    requesterName: 'Carlos Menezes',
    department: 'financeiro',
    problemType: 'slow_computer',
    computerId: 2,
    anydeskId: null,
    contactPhone: '62999990017',
    notifyWhatsapp: false,
    description: 'Demora cinco minutos para abrir o sistema.',
    assignee: 'Suporte TI',
    solution: 'Limpei arquivos temporários.',
    createdAt: thisMonth(6),
    startedAt: thisMonth(6, 11),
    resolvedAt: thisMonth(6, 16),
    updatedAt: thisMonth(6, 16),
    updatedBy: ATTENDANT,
  },
  {
    id: 18,
    status: 'resolved',
    priority: 'medium',
    requesterName: 'Renata Lopes',
    department: 'financeiro',
    problemType: 'slow_computer',
    computerId: 2,
    anydeskId: null,
    contactPhone: '62999990018',
    notifyWhatsapp: false,
    description: 'Travou de novo ao abrir a planilha.',
    assignee: 'Suporte TI',
    solution: 'Fechei programas em segundo plano.',
    createdAt: thisMonth(14),
    startedAt: thisMonth(14, 11),
    resolvedAt: thisMonth(14, 16),
    updatedAt: thisMonth(14, 16),
    updatedBy: ATTENDANT,
  },
  {
    id: 19,
    status: 'in_progress',
    priority: 'high',
    requesterName: 'Carlos Menezes',
    department: 'financeiro',
    problemType: 'slow_computer',
    computerId: 2,
    anydeskId: null,
    contactPhone: '62999990017',
    notifyWhatsapp: false,
    description: 'Trava a cada dois minutos.',
    assignee: 'Suporte TI',
    solution: null,
    createdAt: thisMonth(22),
    startedAt: thisMonth(22, 11),
    resolvedAt: null,
    updatedAt: thisMonth(22, 16),
    updatedBy: ATTENDANT,
  },
  {
    id: 20,
    status: 'open',
    priority: 'high',
    requesterName: 'Renata Lopes',
    department: 'financeiro',
    problemType: 'slow_computer',
    computerId: 2,
    anydeskId: null,
    contactPhone: '62999990018',
    notifyWhatsapp: false,
    description: 'Nao da mais para trabalhar nesse computador.',
    assignee: null,
    solution: null,
    createdAt: thisMonth(27),
    startedAt: null,
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
  },

  /* Chamados de OUTRAS máquinas: dão conteúdo à coluna "Chamados no mês" do inventário e à
     lista "Chamados desta máquina" na ficha, sem inflar a recorrência. */
  {
    id: 21,
    status: 'resolved',
    priority: 'low',
    requesterName: 'Bia Costa',
    department: 'recepcao',
    problemType: 'software_install',
    computerId: 1,
    anydeskId: null,
    contactPhone: '62999990001',
    notifyWhatsapp: false,
    description: 'Preciso do leitor de PDF instalado.',
    assignee: 'Suporte TI',
    solution: 'Instalado e testado.',
    createdAt: thisMonth(9),
    startedAt: thisMonth(9, 11),
    resolvedAt: thisMonth(9, 12),
    updatedAt: thisMonth(9, 12),
    updatedBy: ATTENDANT,
  },
  {
    id: 22,
    status: 'open',
    priority: 'medium',
    requesterName: 'Isabela Marques',
    department: 'paralegal',
    problemType: 'digital_certificate',
    computerId: 8,
    anydeskId: null,
    contactPhone: '62999990022',
    notifyWhatsapp: true,
    description: 'O certificado digital nao e reconhecido pelo site do tribunal.',
    assignee: null,
    solution: null,
    createdAt: thisMonth(28),
    startedAt: null,
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
  },
];

/**
 * TODOS os chamados: os escritos à mão, mais os gerados.
 *
 * Os escritos à mão vêm primeiro e cobrem os casos limite — o chamado sem máquina, o
 * cancelado, os quatro de impressora da mesma pessoa que fazem a recorrência aparecer. Os
 * gerados dão VOLUME: sem eles, o radar de tipos sai com barrinhas de 1 e 2 e o tempo médio
 * de resolução é a média de quatro números.
 */
export const TICKETS_SEED: TicketInsert[] = [...HANDWRITTEN_TICKETS, ...GENERATED_TICKETS_SEED];
