import { type InventoryMovementInsert } from '../../../server/src/lib/db/schema/inventory-movements.schema';

/**
 * Os dados de teste do DEPÓSITO da Manutenção: entradas, saídas e descartes dos produtos de
 * `inventory-items.data.ts`. VERSIONADOS: toda máquina que rodar o seed vê isto.
 *
 * Tudo INVENTADO. O `itemId` aponta para os ids fixos do seed de inventário — por isso este
 * seed roda depois dele.
 *
 * Cada produto tem o extrato na ORDEM em que aconteceu, e o `balanceAfter` de cada linha
 * fecha com a anterior: é o que a tela de Depósito mostra, e um extrato que não fecha no
 * dado de teste ensinaria a desconfiar do número.
 *
 * Os casos que a tela precisa mostrar estão aqui de propósito: produto com estoque, produto
 * ZERADO (o açúcar), produto que nunca teve movimento (o extintor, id 14) e descartes pelos
 * motivos mais comuns.
 */
const KEEPER = 'manutencao@azuos.local';

const NOW = Date.now();

const DAY = 24 * 60 * 60 * 1000;

const daysAgo = (days: number) => new Date(NOW - days * DAY);

/* Sem a autoria, que é a mesma em todas as linhas e entra no fim. */
const MOVEMENTS: Omit<InventoryMovementInsert, 'createdBy'>[] = [
  /* Cadeira giratória (1): seis compradas, uma quebrou. */
  {
    id: 1,
    itemId: 1,
    type: 'in',
    quantity: 6,
    balanceAfter: 6,
    createdAt: daysAgo(119),
  },
  {
    id: 2,
    itemId: 1,
    type: 'disposal',
    quantity: 1,
    balanceAfter: 5,
    reason: 'broken',
    note: 'Base rachou; sem conserto.',
    createdAt: daysAgo(20),
  },

  /* Mesa em L (2) e armário (3): entraram e ficaram. */
  {
    id: 3,
    itemId: 2,
    type: 'in',
    quantity: 4,
    balanceAfter: 4,
    createdAt: daysAgo(119),
  },
  {
    id: 4,
    itemId: 3,
    type: 'in',
    quantity: 2,
    balanceAfter: 2,
    createdAt: daysAgo(117),
  },

  /* Café (4): o que mais gira — compra, uso e um pacote que venceu no fundo do armário. */
  {
    id: 5,
    itemId: 4,
    type: 'in',
    quantity: 10,
    balanceAfter: 10,
    createdAt: daysAgo(58),
  },
  {
    id: 6,
    itemId: 4,
    type: 'out',
    quantity: 6,
    balanceAfter: 4,
    createdAt: daysAgo(30),
  },
  {
    id: 7,
    itemId: 4,
    type: 'disposal',
    quantity: 1,
    balanceAfter: 3,
    reason: 'expired',
    note: 'Pacote vencido achado no fundo do armário da copa.',
    createdAt: daysAgo(12),
  },
  {
    id: 8,
    itemId: 4,
    type: 'in',
    quantity: 4,
    balanceAfter: 7,
    createdAt: daysAgo(6),
  },

  /* Água (5). */
  {
    id: 9,
    itemId: 5,
    type: 'in',
    quantity: 8,
    balanceAfter: 8,
    createdAt: daysAgo(59),
  },
  {
    id: 10,
    itemId: 5,
    type: 'out',
    quantity: 5,
    balanceAfter: 3,
    createdAt: daysAgo(9),
  },

  /* Açúcar (6): ZERADO — é o produto que o painel aponta como sem estoque. */
  {
    id: 11,
    itemId: 6,
    type: 'in',
    quantity: 5,
    balanceAfter: 5,
    createdAt: daysAgo(44),
  },
  {
    id: 12,
    itemId: 6,
    type: 'out',
    quantity: 5,
    balanceAfter: 0,
    createdAt: daysAgo(4),
  },

  /* Limpeza (7 e 8). */
  {
    id: 13,
    itemId: 7,
    type: 'in',
    quantity: 20,
    balanceAfter: 20,
    createdAt: daysAgo(88),
  },
  {
    id: 14,
    itemId: 7,
    type: 'out',
    quantity: 8,
    balanceAfter: 12,
    createdAt: daysAgo(25),
  },
  {
    id: 15,
    itemId: 8,
    type: 'in',
    quantity: 12,
    balanceAfter: 12,
    createdAt: daysAgo(88),
  },
  {
    id: 16,
    itemId: 8,
    type: 'out',
    quantity: 7,
    balanceAfter: 5,
    createdAt: daysAgo(14),
  },

  /* Lâmpada (9): uma caixa sumiu na mudança de sala. */
  {
    id: 17,
    itemId: 9,
    type: 'in',
    quantity: 3,
    balanceAfter: 3,
    createdAt: daysAgo(74),
  },
  {
    id: 18,
    itemId: 9,
    type: 'disposal',
    quantity: 1,
    balanceAfter: 2,
    reason: 'lost',
    note: null,
    createdAt: daysAgo(40),
  },

  /* Torneira (10), bebedouro (11) e ar-condicionado (12). */
  {
    id: 19,
    itemId: 10,
    type: 'in',
    quantity: 2,
    balanceAfter: 2,
    createdAt: daysAgo(29),
  },
  {
    id: 20,
    itemId: 11,
    type: 'in',
    quantity: 1,
    balanceAfter: 1,
    createdAt: daysAgo(199),
  },
  {
    id: 21,
    itemId: 12,
    type: 'in',
    quantity: 3,
    balanceAfter: 3,
    createdAt: daysAgo(399),
  },

  /* Suporte de monitor (13): comprado e nunca usado. */
  {
    id: 22,
    itemId: 13,
    type: 'in',
    quantity: 1,
    balanceAfter: 1,
    note: 'Ainda na caixa.',
    createdAt: daysAgo(15),
  },
];

export const INVENTORY_MOVEMENTS_SEED: InventoryMovementInsert[] = MOVEMENTS.map((movement) => ({
  ...movement,
  createdBy: KEEPER,
}));
