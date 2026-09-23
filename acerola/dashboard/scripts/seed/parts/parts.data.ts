import { type PartMovementInsert } from '../../../server/src/lib/db/schema/part-movements.schema';
import { type PartInsert } from '../../../server/src/lib/db/schema/parts.schema';

/**
 * Os dados de teste do depósito. VERSIONADOS: toda máquina que rodar o seed vê isto.
 *
 * Peças INVENTADAS, com marcas e modelos genéricos. Nota fiscal, número de série e nome de
 * fornecedor de verdade não entram aqui — este arquivo vai para o git e fica no histórico.
 *
 * **O saldo de cada peça é a soma do extrato dela**, e não um número escolhido à mão: os
 * saldos abaixo foram calculados das movimentações, e o seed grava os dois juntos. Um saldo
 * que não fecha com o extrato é exatamente o defeito que a tela existe para não ter.
 */
const TI = 'suporte@azuos.local';

const NOW = Date.now();

const DAY = 24 * 60 * 60 * 1000;

const daysAgo = (days: number) => new Date(NOW - days * DAY);

export const PARTS_SEED: PartInsert[] = [
  /* A peça mais mexida do depósito: entrou lote, saiu para duas máquinas. */
  {
    id: 1,
    name: 'SSD 240 GB Kingston',
    category: 'ssd',
    condition: 'new',
    balance: 3,
    createdAt: daysAgo(120),
    createdBy: TI,
  },
  /* MESMA descrição, condição diferente: são duas linhas de propósito — somar as duas
     esconderia que os SSDs que sobraram são os usados. */
  {
    id: 2,
    name: 'SSD 240 GB Kingston',
    category: 'ssd',
    condition: 'used',
    balance: 2,
    createdAt: daysAgo(120),
    createdBy: TI,
  },
  {
    id: 3,
    name: 'Memória DDR4 8 GB 2666 MHz',
    category: 'memory',
    condition: 'new',
    balance: 4,
    createdAt: daysAgo(100),
    createdBy: TI,
  },
  {
    id: 4,
    name: 'Monitor 22 polegadas',
    category: 'monitor',
    condition: 'used',
    balance: 1,
    createdAt: daysAgo(90),
    createdBy: TI,
  },
  {
    id: 5,
    name: 'Teclado USB ABNT2',
    category: 'keyboard',
    condition: 'new',
    balance: 6,
    createdAt: daysAgo(80),
    createdBy: TI,
  },
  {
    id: 6,
    name: 'Mouse óptico USB',
    category: 'mouse',
    condition: 'new',
    balance: 5,
    createdAt: daysAgo(80),
    createdBy: TI,
  },
  /* CASO LIMITE: prateleira vazia. A tela precisa mostrar zero sem sumir com a peça — é
     por ela que alguém descobre o que precisa comprar. */
  {
    id: 7,
    name: 'Fone com microfone para atendimento',
    category: 'headset',
    condition: 'new',
    balance: 0,
    createdAt: daysAgo(70),
    createdBy: TI,
  },
  /* CASO LIMITE DE LAYOUT: descrição comprida, que precisa quebrar linha na tabela. */
  {
    id: 8,
    name: 'Adaptador DisplayPort para VGA com cabo de 1,8 m (para os monitores antigos da recepção)',
    category: 'adapter_dp_vga',
    condition: 'new',
    balance: 2,
    createdAt: daysAgo(60),
    createdBy: TI,
  },
];

/**
 * O EXTRATO: cada entrada e cada saída, na ordem em que aconteceram.
 *
 * `balanceAfter` é o saldo depois da linha, como num extrato de banco — por isso a ordem
 * aqui importa, e os números precisam fechar com o saldo da peça lá em cima.
 */
export const PART_MOVEMENTS_SEED: PartMovementInsert[] = [
  /* SSD novo: comprou 5, instalou 2 (uma delas na máquina da contábil). Saldo 3. */
  {
    id: 1,
    partId: 1,
    type: 'in',
    quantity: 5,
    balanceAfter: 5,
    handledBy: 'Suporte TI',
    note: 'Compra do lote de reposição.',
    createdAt: daysAgo(120),
    createdBy: TI,
  },
  {
    id: 2,
    partId: 1,
    type: 'out',
    quantity: 1,
    balanceAfter: 4,
    computerId: 2,
    handledBy: 'Suporte TI',
    note: 'Troca do disco rígido por SSD.',
    createdAt: daysAgo(95),
    createdBy: TI,
  },
  {
    id: 3,
    partId: 1,
    type: 'out',
    quantity: 1,
    balanceAfter: 3,
    computerId: 3,
    handledBy: 'Carlos (assistência externa)',
    note: 'Instalado na máquina do fechamento.',
    createdAt: daysAgo(35),
    createdBy: TI,
  },

  /* SSD usado: os dois que saíram das máquinas antigas voltaram para a prateleira. */
  {
    id: 4,
    partId: 2,
    type: 'in',
    quantity: 2,
    balanceAfter: 2,
    handledBy: 'Suporte TI',
    note: 'Discos retirados das máquinas trocadas.',
    createdAt: daysAgo(95),
    createdBy: TI,
  },

  /* Memória: comprou 6, colocou 2 na máquina do financeiro. */
  {
    id: 5,
    partId: 3,
    type: 'in',
    quantity: 6,
    balanceAfter: 6,
    handledBy: 'Suporte TI',
    note: 'Compra para os upgrades de memória.',
    createdAt: daysAgo(100),
    createdBy: TI,
  },
  {
    id: 6,
    partId: 3,
    type: 'out',
    quantity: 2,
    balanceAfter: 4,
    computerId: 2,
    handledBy: 'Suporte TI',
    note: 'Upgrade de 4 GB para 8 GB.',
    createdAt: daysAgo(50),
    createdBy: TI,
  },

  { id: 7, partId: 4, type: 'in', quantity: 1, balanceAfter: 1, handledBy: 'Suporte TI', note: 'Monitor recolhido da sala de reunião.', createdAt: daysAgo(90), createdBy: TI },
  { id: 8, partId: 5, type: 'in', quantity: 6, balanceAfter: 6, handledBy: 'Suporte TI', createdAt: daysAgo(80), createdBy: TI },
  { id: 9, partId: 6, type: 'in', quantity: 6, balanceAfter: 6, handledBy: 'Suporte TI', createdAt: daysAgo(80), createdBy: TI },
  {
    id: 10,
    partId: 6,
    type: 'out',
    quantity: 1,
    balanceAfter: 5,
    computerId: 1,
    handledBy: 'Bia Costa',
    note: 'Mouse do balcão parou de clicar.',
    createdAt: daysAgo(15),
    createdBy: TI,
  },

  /* Fone: entrou 2 e saíram os 2 — é assim que a prateleira chega a zero. */
  { id: 11, partId: 7, type: 'in', quantity: 2, balanceAfter: 2, handledBy: 'Suporte TI', createdAt: daysAgo(70), createdBy: TI },
  {
    id: 12,
    partId: 7,
    type: 'out',
    quantity: 2,
    balanceAfter: 0,
    computerId: 6,
    handledBy: 'Gustavo Alves',
    note: 'Últimos dois fones entregues para o atendimento.',
    createdAt: daysAgo(30),
    createdBy: TI,
  },

  { id: 13, partId: 8, type: 'in', quantity: 2, balanceAfter: 2, handledBy: 'Suporte TI', createdAt: daysAgo(60), createdBy: TI },
];
