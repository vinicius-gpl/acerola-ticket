import { type InventoryItemInsert } from '../../../server/src/lib/db/schema/inventory-items.schema';

/**
 * Os dados de teste do inventário da Manutenção. VERSIONADOS: toda máquina que rodar o seed
 * vê isto.
 *
 * Produtos INVENTADOS, com marcas genéricas. Nota fiscal, fornecedor de verdade e etiqueta de
 * patrimônio real não entram aqui — este arquivo vai para o git e fica no histórico.
 *
 * A lista cobre as cinco categorias de propósito, e também os CASOS LIMITE que quebram tela:
 * produto sem foto, sem lugar, sem código, com observação longa e com nome comprido.
 *
 * Nenhum item nasce com foto: imagem de verdade não entra no repositório, e um link
 * inventado mostraria figura quebrada na tela. A foto é o que a pessoa envia ao testar.
 */
const KEEPER = 'manutencao@azuos.local';

const NOW = Date.now();

const DAY = 24 * 60 * 60 * 1000;

const daysAgo = (days: number) => new Date(NOW - days * DAY);

export const INVENTORY_ITEMS_SEED: InventoryItemInsert[] = [
  /* Mobiliário: o grosso do inventário, e o que tem etiqueta de patrimônio. */
  {
    id: 1,
    name: 'Cadeira giratória com apoio de braço',
    category: 'furniture',
    unit: 'unit',
    location: 'Sala da contabilidade',
    code: 'PAT-0101',
    note: 'Pistão trocado em março.',
    createdAt: daysAgo(120),
    createdBy: KEEPER,
  },
  {
    id: 2,
    name: 'Mesa em L 1,40 m',
    category: 'furniture',
    unit: 'unit',
    location: 'Sala da contabilidade',
    code: 'PAT-0102',
    note: null,
    createdAt: daysAgo(120),
    createdBy: KEEPER,
  },
  {
    id: 3,
    name: 'Armário de aço com duas portas',
    category: 'furniture',
    unit: 'unit',
    location: 'Arquivo',
    code: 'PAT-0103',
    note: null,
    createdAt: daysAgo(118),
    createdBy: KEEPER,
  },

  /* Mercadinho: o que acaba e precisa ser reposto toda semana. */
  {
    id: 4,
    name: 'Café torrado e moído 500 g',
    category: 'pantry',
    unit: 'package',
    location: 'Copa',
    code: null,
    note: 'Marca que o pessoal prefere; comprar dois pacotes por vez.',
    createdAt: daysAgo(60),
    createdBy: KEEPER,
  },
  {
    id: 5,
    name: 'Água mineral 20 L',
    category: 'pantry',
    unit: 'unit',
    location: 'Copa',
    code: null,
    note: null,
    createdAt: daysAgo(60),
    createdBy: KEEPER,
  },
  {
    id: 6,
    name: 'Açúcar refinado',
    category: 'pantry',
    unit: 'kilogram',
    location: 'Copa',
    code: null,
    note: null,
    createdAt: daysAgo(45),
    createdBy: KEEPER,
  },

  /* Limpeza: medido em litro, que é o que mostra a unidade fazendo diferença na tela. */
  {
    id: 7,
    name: 'Desinfetante concentrado',
    category: 'cleaning',
    unit: 'liter',
    location: 'Depósito de limpeza',
    code: null,
    note: null,
    createdAt: daysAgo(90),
    createdBy: KEEPER,
  },
  {
    id: 8,
    name: 'Papel higiênico folha dupla',
    category: 'cleaning',
    unit: 'package',
    location: 'Depósito de limpeza',
    code: null,
    note: null,
    createdAt: daysAgo(90),
    createdBy: KEEPER,
  },

  /* Elétrica e hidráulica: o que a Manutenção usa para consertar, não para consumir. */
  {
    id: 9,
    name: 'Lâmpada LED 9 W bivolt',
    category: 'utility',
    unit: 'box',
    location: 'Almoxarifado',
    code: null,
    note: 'Caixa com 10 unidades.',
    createdAt: daysAgo(75),
    createdBy: KEEPER,
  },
  {
    id: 10,
    name: 'Torneira de bancada',
    category: 'utility',
    unit: 'unit',
    location: 'Almoxarifado',
    code: null,
    note: null,
    createdAt: daysAgo(30),
    createdBy: KEEPER,
  },

  /* Eletrodoméstico: o que tem patrimônio e manutenção própria. */
  {
    id: 11,
    name: 'Bebedouro de coluna',
    category: 'appliance',
    unit: 'unit',
    location: 'Copa',
    code: 'PAT-0201',
    note: 'Filtro trocado a cada seis meses.',
    createdAt: daysAgo(200),
    createdBy: KEEPER,
    updatedAt: daysAgo(10),
    updatedBy: KEEPER,
  },
  {
    id: 12,
    name: 'Ar-condicionado split 12.000 BTUs',
    category: 'appliance',
    unit: 'unit',
    location: 'Sala da diretoria',
    code: 'PAT-0202',
    note: 'Limpeza semestral contratada com prestador externo.',
    createdAt: daysAgo(400),
    createdBy: KEEPER,
  },

  /* CASO LIMITE: nome comprido, observação longa e nenhum lugar — é o que estoura o cartão. */
  {
    id: 13,
    name: 'Suporte articulado de parede para monitor de até 32 polegadas com inclinação',
    category: 'other',
    unit: 'unit',
    location: null,
    code: null,
    note: 'Comprado para a sala de reunião e nunca instalado. Está encostado atrás do armário do arquivo, ainda na caixa, esperando a decisão sobre a reforma da sala — conferir se os parafusos vieram junto antes de pedir outro.',
    createdAt: daysAgo(15),
    createdBy: KEEPER,
  },

  /* CASO LIMITE: o mínimo que um cadastro pode ter — nome, categoria e medida. */
  {
    id: 14,
    name: 'Extintor',
    category: 'other',
    unit: 'unit',
    location: null,
    code: null,
    note: null,
    createdAt: daysAgo(5),
    createdBy: KEEPER,
  },
];
