/**
 * O CATÁLOGO DO DEPÓSITO: as categorias de peça, a condição e o tipo de movimentação.
 *
 * As categorias são as do sistema antigo, na mesma ordem: elas descrevem o que a TI de fato
 * guarda na prateleira, e inventar uma taxonomia nova obrigaria a recadastrar tudo à mão.
 *
 * A chave é inglês (o usuário não vê) e o rótulo é português (vê) — CONTRIBUTING §1. Os dois
 * de adaptador viram `adapter_*` porque a seta do rótulo ("→") não cabe em coluna de banco.
 */

export const PART_CATEGORIES = [
  'ssd',
  'memory',
  'monitor',
  'keyboard',
  'mouse',
  'headset',
  'adapter_dp_vga',
  'adapter_hdmi_vga',
  'desktop',
  'other',
] as const;

export type PartCategory = (typeof PART_CATEGORIES)[number];

export const PART_CATEGORY_LABELS: Record<PartCategory, string> = {
  ssd: 'SSD',
  memory: 'Memória',
  monitor: 'Monitor',
  keyboard: 'Teclado',
  mouse: 'Mouse',
  headset: 'Fone de ouvido',
  adapter_dp_vga: 'Adaptador DisplayPort → VGA',
  adapter_hdmi_vga: 'Adaptador HDMI → VGA',
  desktop: 'Máquina (CPU)',
  other: 'Outro',
};

export function partCategoryLabel(category: PartCategory): string {
  return PART_CATEGORY_LABELS[category];
}

/**
 * Peça NOVA e peça USADA não são a mesma peça, mesmo com o mesmo nome.
 *
 * Duas linhas separadas no depósito, de propósito: somar as duas esconderia que os quatro
 * SSDs do estoque são todos usados, na hora de decidir o que instalar numa máquina nova.
 */
export const PART_CONDITIONS = ['new', 'used'] as const;

export type PartCondition = (typeof PART_CONDITIONS)[number];

export const PART_CONDITION_LABELS: Record<PartCondition, string> = {
  new: 'Nova',
  used: 'Usada',
};

export function partConditionLabel(condition: PartCondition): string {
  return PART_CONDITION_LABELS[condition];
}

export function partConditionTone(condition: PartCondition): 'success' | 'neutral' {
  return condition === 'new' ? 'success' : 'neutral';
}

/** Entrada soma ao saldo; saída subtrai. Não existe terceiro tipo. */
export const MOVEMENT_TYPES = ['in', 'out'] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  in: 'Entrada',
  out: 'Saída',
};

export function movementTypeLabel(type: MovementType): string {
  return MOVEMENT_TYPE_LABELS[type];
}

export function movementTypeTone(type: MovementType): 'success' | 'warning' {
  return type === 'in' ? 'success' : 'warning';
}

/**
 * O saldo depois de uma movimentação.
 *
 * Função pura, e é ela que manda: o saldo do depósito NÃO é digitado, é o resultado das
 * entradas e saídas. No sistema antigo esta conta vivia num gatilho do banco, onde não dava
 * para testá-la nem para ler a regra junto com o resto do código.
 */
export function balanceAfter(balance: number, type: MovementType, quantity: number): number {
  return type === 'in' ? balance + quantity : balance - quantity;
}

/**
 * Se a saída cabe no que existe na prateleira.
 *
 * O sistema antigo prendia o saldo em zero (`greatest(0, ...)`) e seguia em frente: tirar 5
 * de um estoque de 2 deixava zero, sem avisar ninguém. O saldo passava a mentir, e a
 * diferença só aparecia quando alguém ia buscar a peça e não achava.
 */
export function fitsInStock(balance: number, type: MovementType, quantity: number): boolean {
  if (type === 'in') return true;

  return quantity <= balance;
}
