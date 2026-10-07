/**
 * O DEPÓSITO DA MANUTENÇÃO: o que entra, o que sai e o que é descartado.
 *
 * É a conta que explica o número ao lado de cada produto do inventário. Existe separada do
 * depósito da TI (`part-catalog.util`) porque aqui há um terceiro movimento, o DESCARTE: a
 * cadeira quebrada e o café vencido também saem da prateleira, mas por um motivo que precisa
 * ficar escrito — é a diferença entre "usamos" e "perdemos".
 *
 * A chave é inglês (o usuário não vê) e o rótulo é português (vê) — CONTRIBUTING §1.
 */

export const STOCK_MOVEMENT_TYPES = ['in', 'out', 'disposal'] as const;

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  in: 'Entrada',
  out: 'Saída',
  disposal: 'Descarte',
};

export function stockMovementTypeLabel(type: StockMovementType): string {
  return STOCK_MOVEMENT_TYPE_LABELS[type];
}

export function isStockMovementType(value: unknown): value is StockMovementType {
  return typeof value === 'string' && (STOCK_MOVEMENT_TYPES as readonly string[]).includes(value);
}

/** Por que o produto foi descartado. Lista fixa: é por ela que o painel conta as perdas. */
export const DISPOSAL_REASONS = ['broken', 'expired', 'obsolete', 'lost', 'other'] as const;

export type DisposalReason = (typeof DISPOSAL_REASONS)[number];

export const DISPOSAL_REASON_LABELS: Record<DisposalReason, string> = {
  broken: 'Quebrou',
  expired: 'Venceu',
  obsolete: 'Não serve mais',
  lost: 'Sumiu',
  other: 'Outro motivo',
};

export function disposalReasonLabel(reason: DisposalReason): string {
  return DISPOSAL_REASON_LABELS[reason];
}

export function disposalReasonOptions(): { value: DisposalReason; label: string }[] {
  return DISPOSAL_REASONS.map((value) => ({ value, label: DISPOSAL_REASON_LABELS[value] }));
}

/** O saldo depois do movimento. Só a entrada soma; saída e descarte tiram da prateleira. */
export function stockAfter(balance: number, type: StockMovementType, quantity: number): number {
  return type === 'in' ? balance + quantity : balance - quantity;
}

/**
 * Se o movimento cabe no que existe.
 *
 * O saldo nunca fica negativo: tirar 5 de um estoque de 2 é sinal de que alguém esqueceu de
 * registrar uma entrada, e aceitar calado faria o número mentir a partir dali.
 */
export function fitsInInventoryStock(
  balance: number,
  type: StockMovementType,
  quantity: number,
): boolean {
  if (type === 'in') return true;

  return quantity <= balance;
}
