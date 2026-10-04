/**
 * O vocabulário de situação de um chamado.
 *
 * A lista mora no domínio porque três camadas dependem dela ao mesmo tempo: o schema Zod
 * valida por ela, a coluna do Postgres restringe por ela e o selo da tela escolhe a cor por
 * ela. Três listas escritas à mão divergem na primeira vez que alguém acrescenta um valor.
 *
 * **Chamado não se exclui.** Não há remoção no sistema: o que muda é a situação. Um chamado
 * aberto por engano vira `cancelled`, não desaparece — apagar destruiria o histórico que
 * alimenta os indicadores e a memória de quem já pediu o quê.
 *
 * **A situação é o ESTÁGIO da ordem de serviço, e ninguém a edita à mão.** Ela é consequência
 * do último histórico lançado (ver `ticket-history.util.ts`): quem registra "aguardando peça"
 * põe o chamado nesse estágio; quem registra a solução o encerra. Um campo de situação editável
 * à parte permitiria um chamado "resolvido" sem ninguém ter escrito o que foi feito.
 *
 * Os dois estágios de espera existem porque "em atendimento" misturava duas coisas opostas: o
 * que está na mão do TI e o que está parado esperando alguém. E "encerrado com ressalva" é o
 * fim que não é uma solução inteira — funciona, mas ficou algo por fazer, e a ressalva diz o quê.
 */
export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'waiting_requester',
  'waiting_third_party',
  'resolved',
  'resolved_with_caveats',
  'cancelled',
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export type TicketStatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/**
 * Em que MOMENTO o chamado está. É por aqui que o sistema sabe o que cada estágio significa,
 * sem conhecer o nome de nenhum:
 *
 *  - `queue`   — na fila, ninguém pegou ainda;
 *  - `working` — na mão do TI;
 *  - `waiting` — parado, esperando alguém de fora do TI (o tempo aqui não é de atendimento);
 *  - `closed`  — encerrado: saiu da fila de trabalho.
 */
export type TicketPhase = 'queue' | 'working' | 'waiting' | 'closed';

/**
 * A FICHA de um estágio — tudo o que o sistema precisa saber sobre ele, num lugar só.
 *
 * `isSolved` só faz sentido em estágio encerrado: diz se o problema foi tratado (com ou sem
 * ressalva). É o que o indicador de "resolvidos" e o tempo médio contam — cancelado encerra,
 * mas não resolve.
 */
export type TicketStatusDefinition = {
  /** O texto de tela (português). A chave é inglês, que o usuário não vê. */
  label: string;
  /** A cor vem do domínio: deixar cada tela escolher é a mesma situação verde numa e cinza noutra. */
  tone: TicketStatusTone;
  phase: TicketPhase;
  isSolved: boolean;
};

/**
 * O CATÁLOGO DE ESTÁGIOS. Para criar um estágio novo:
 *
 *  1. acrescente a chave em `TICKET_STATUSES`, acima;
 *  2. acrescente a ficha dele aqui (o TypeScript recusa compilar enquanto faltar);
 *  3. gere a migration (`npm run db:generate`) — a checagem do banco sai desta mesma lista.
 *
 * Nenhum `if (status === '...')` espalhado precisa mudar: fila, indicadores e regras de
 * histórico perguntam pela FASE (`phase`) e por `isSolved`, nunca pelo nome do estágio.
 */
export const TICKET_STATUS_CATALOG = {
  open: { label: 'Aberto', tone: 'danger', phase: 'queue', isSolved: false },
  in_progress: { label: 'Em atendimento', tone: 'info', phase: 'working', isSolved: false },
  waiting_requester: {
    label: 'Aguardando solicitante',
    tone: 'warning',
    phase: 'waiting',
    isSolved: false,
  },
  waiting_third_party: {
    label: 'Aguardando terceiro',
    tone: 'warning',
    phase: 'waiting',
    isSolved: false,
  },
  resolved: { label: 'Resolvido', tone: 'success', phase: 'closed', isSolved: true },
  /* O fim que não é uma solução inteira: funciona, mas ficou algo por fazer — e a ressalva,
     escrita no histórico que encerrou, diz o quê. */
  resolved_with_caveats: {
    label: 'Encerrado com ressalva',
    tone: 'warning',
    phase: 'closed',
    isSolved: true,
  },
  cancelled: { label: 'Cancelado', tone: 'neutral', phase: 'closed', isSolved: false },
} as const satisfies Record<TicketStatus, TicketStatusDefinition>;

function statusesWhere(matches: (definition: TicketStatusDefinition) => boolean): TicketStatus[] {
  return TICKET_STATUSES.filter((status) => matches(TICKET_STATUS_CATALOG[status]));
}

/** Os rótulos, tirados do catálogo — para quem precisa do mapa inteiro (um seletor, um filtro). */
export const TICKET_STATUS_LABELS = Object.fromEntries(
  TICKET_STATUSES.map((status) => [status, TICKET_STATUS_CATALOG[status].label]),
) as Record<TicketStatus, string>;

export function ticketStatusTone(status: TicketStatus): TicketStatusTone {
  return TICKET_STATUS_CATALOG[status].tone;
}

export function ticketStatusLabel(status: TicketStatus): string {
  return TICKET_STATUS_CATALOG[status].label;
}

export function ticketStatusPhase(status: TicketStatus): TicketPhase {
  return TICKET_STATUS_CATALOG[status].phase;
}

export function isTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === 'string' && (TICKET_STATUSES as readonly string[]).includes(value);
}

/**
 * Estágios que encerram o chamado — ele sai da fila de trabalho do TI.
 *
 * Saem do catálogo (`phase: 'closed'`), e não de uma lista escrita à mão: "encerrado" é uma
 * pergunta que a fila, o indicador de tempo médio e o contador do painel fazem separadamente,
 * e uma lista à parte esqueceria o estágio novo na primeira vez que alguém criasse um.
 */
export const CLOSED_TICKET_STATUSES: readonly TicketStatus[] = statusesWhere(
  (definition) => definition.phase === 'closed',
);

export function isClosedTicketStatus(status: TicketStatus): boolean {
  return ticketStatusPhase(status) === 'closed';
}

/**
 * Estágios em que o chamado está PARADO esperando alguém de fora do TI. O tempo neles não é
 * tempo de atendimento — e é por eles que se cobra a resposta de quem abriu ou do fornecedor.
 */
export const WAITING_TICKET_STATUSES: readonly TicketStatus[] = statusesWhere(
  (definition) => definition.phase === 'waiting',
);

export function isWaitingTicketStatus(status: TicketStatus): boolean {
  return ticketStatusPhase(status) === 'waiting';
}

/**
 * Encerrado COM SUCESSO: o problema foi tratado, com ou sem ressalva. É o que o indicador de
 * "resolvidos" e o tempo médio de resolução contam — cancelado encerra, mas não resolve.
 */
export const SOLVED_TICKET_STATUSES: readonly TicketStatus[] = statusesWhere(
  (definition) => definition.isSolved,
);

export function isSolvedTicketStatus(status: TicketStatus): boolean {
  return TICKET_STATUS_CATALOG[status].isSolved;
}

/** Urgência informada por quem abre o chamado. */
export const TICKET_PRIORITIES = ['low', 'medium', 'high'] as const;

export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

export function ticketPriorityLabel(priority: TicketPriority): string {
  return TICKET_PRIORITY_LABELS[priority];
}

export type TicketPriorityTone = 'neutral' | 'warning' | 'danger';

const PRIORITY_TONES: Record<TicketPriority, TicketPriorityTone> = {
  low: 'neutral',
  medium: 'warning',
  high: 'danger',
};

export function ticketPriorityTone(priority: TicketPriority): TicketPriorityTone {
  return PRIORITY_TONES[priority];
}

/**
 * Quem abre o chamado não escolhe a situação: todo chamado nasce aberto. Deixar a situação
 * vir do formulário público permitiria alguém abrir um chamado já "resolvido".
 */
export const INITIAL_TICKET_STATUS: TicketStatus = 'open';

export const DEFAULT_TICKET_PRIORITY: TicketPriority = 'medium';
