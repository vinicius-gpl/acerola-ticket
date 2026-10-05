import { type MaintenanceQuoteInsert } from '../../../server/src/lib/db/schema/maintenance-quotes.schema';

/**
 * Os dados de teste dos ORÇAMENTOS da Manutenção. VERSIONADOS: toda máquina que rodar o seed
 * vê isto.
 *
 * Empresas, valores e serviços INVENTADOS. Nome de fornecedor de verdade, CNPJ e documento
 * real não entram aqui — este arquivo vai para o git e fica no histórico.
 *
 * A lista cobre os três tipos (produto, serviço, outro) e as três situações (aguardando,
 * aprovado, recusado), e também os CASOS LIMITE que quebram tela: descrição longa, valor
 * alto, valor zero (cortesia) e nome de empresa comprido.
 *
 * Nenhum orçamento nasce com documento: PDF de verdade não entra no repositório, e um link
 * inventado abriria uma página de erro. O documento é o que a pessoa envia ao testar.
 */
const KEEPER = 'manutencao@azuos.local';

const NOW = Date.now();

const DAY = 24 * 60 * 60 * 1000;

const daysAgo = (days: number) => new Date(NOW - days * DAY);

/** O dia, sem hora, como a coluna `date` guarda. */
const dayOf = (days: number) => daysAgo(days).toISOString().slice(0, 10);

export const MAINTENANCE_QUOTES_SEED: MaintenanceQuoteInsert[] = [
  /* Aguardando decisão: é o que o painel soma em "orçamentos aguardando". */
  {
    id: 1,
    supplier: 'Clima Norte Refrigeração',
    description: 'Limpeza e recarga de gás dos três aparelhos de ar-condicionado',
    kind: 'service',
    amountCents: 96000,
    quotedOn: dayOf(3),
    status: 'pending',
    note: 'Inclui a troca do filtro da sala da diretoria.',
    createdAt: daysAgo(3),
    createdBy: KEEPER,
  },
  {
    id: 2,
    supplier: 'Móveis Planalto',
    description: 'Seis cadeiras giratórias com apoio de braço',
    kind: 'product',
    amountCents: 354000,
    quotedOn: dayOf(5),
    status: 'pending',
    note: null,
    createdAt: daysAgo(5),
    createdBy: KEEPER,
  },
  {
    id: 3,
    supplier: 'Móveis Bela Vista',
    description: 'Seis cadeiras giratórias com apoio de braço',
    kind: 'product',
    amountCents: 318000,
    quotedOn: dayOf(4),
    status: 'pending',
    note: 'Segunda cotação das mesmas cadeiras; prazo de entrega de 20 dias.',
    createdAt: daysAgo(4),
    createdBy: KEEPER,
  },

  /* Aprovados: um dentro dos últimos 30 dias (entra na soma do painel) e um antigo (não). */
  {
    id: 4,
    supplier: 'Dedetiza Cerrado',
    description: 'Dedetização e desratização do escritório inteiro',
    kind: 'service',
    amountCents: 68000,
    quotedOn: dayOf(22),
    status: 'approved',
    decidedAt: daysAgo(18),
    note: 'Serviço feito num sábado.',
    createdAt: daysAgo(22),
    createdBy: KEEPER,
    updatedAt: daysAgo(18),
    updatedBy: KEEPER,
  },
  {
    id: 5,
    supplier: 'Elétrica Araguaia',
    description: 'Troca do quadro de disjuntores da copa',
    kind: 'service',
    amountCents: 124000,
    quotedOn: dayOf(95),
    status: 'approved',
    decidedAt: daysAgo(90),
    note: null,
    createdAt: daysAgo(95),
    createdBy: KEEPER,
    updatedAt: daysAgo(90),
    updatedBy: KEEPER,
  },

  /* Recusado. */
  {
    id: 6,
    supplier: 'Persianas Horizonte',
    description: 'Persianas verticais para a sala de reunião',
    kind: 'product',
    amountCents: 289000,
    quotedOn: dayOf(40),
    status: 'rejected',
    decidedAt: daysAgo(35),
    note: 'Ficou para depois da reforma da sala.',
    createdAt: daysAgo(40),
    createdBy: KEEPER,
    updatedAt: daysAgo(35),
    updatedBy: KEEPER,
  },

  /* CASO LIMITE: empresa de nome comprido, descrição longa e valor alto. */
  {
    id: 7,
    supplier: 'Construtora e Reformas Vale do Rio Vermelho Engenharia e Acabamentos',
    description:
      'Reforma completa da sala de reunião: remoção do forro antigo, forro novo em gesso acartonado, pintura das quatro paredes, troca do piso por vinílico, instalação de seis pontos de tomada e passagem de cabo de rede para a mesa.',
    kind: 'other',
    amountCents: 4875000,
    quotedOn: dayOf(10),
    status: 'pending',
    note: 'Valor válido por 30 dias.',
    createdAt: daysAgo(10),
    createdBy: KEEPER,
  },

  /* CASO LIMITE: valor zero — visita de avaliação sem custo. */
  {
    id: 8,
    supplier: 'Hidráulica Boa Água',
    description: 'Visita para avaliar o vazamento do banheiro do térreo',
    kind: 'service',
    amountCents: 0,
    quotedOn: dayOf(1),
    status: 'approved',
    decidedAt: daysAgo(1),
    note: null,
    createdAt: daysAgo(1),
    createdBy: KEEPER,
    updatedAt: daysAgo(1),
    updatedBy: KEEPER,
  },
];
