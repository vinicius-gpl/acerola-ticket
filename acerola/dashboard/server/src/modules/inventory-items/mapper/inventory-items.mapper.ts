import {
  type CreateInventoryItemInput,
  type InventoryItem,
  type UpdateInventoryItemInput,
} from '@template/shared/schemas/inventory-item.schema';
import {
  type CreateInventoryMovementInput,
  type InventoryMovement,
} from '@template/shared/schemas/inventory-movement.schema';

import { setIfDefined } from '../../../lib/db/partial-update.util';
import {
  type InventoryItemInsert,
  type InventoryItemRow,
} from '../../../lib/db/schema/inventory-items.schema';
import {
  type InventoryMovementInsert,
  type InventoryMovementRow,
} from '../../../lib/db/schema/inventory-movements.schema';

/**
 * A tradução entre a linha do banco e o contrato.
 *
 * `photoUrl` chega PRONTO de quem chamou: o link é assinado pelo storage a cada leitura e
 * expira, então ele não pode ser calculado aqui dentro — o mapper é síncrono e puro, e é o
 * que torna ele testável sem subir nada.
 */
export function toInventoryItem(row: InventoryItemRow, photoUrl: string | null): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    location: row.location,
    code: row.code,
    note: row.note,
    photoUrl,
    balance: row.balance,

    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    updatedBy: row.updatedBy,
  };
}

/** A linha do extrato com o produto dela, do jeito que o repository entrega. */
export type MovementWithItem = {
  movement: InventoryMovementRow;
  item: { name: string; unit: InventoryItemRow['unit'] };
};

/** Um movimento do depósito, já com o nome do produto — a lista não precisa ir buscá-lo. */
export function toInventoryMovement({ movement, item }: MovementWithItem): InventoryMovement {
  return {
    id: movement.id,
    itemId: movement.itemId,
    itemName: item.name,
    itemUnit: item.unit,
    type: movement.type,
    quantity: movement.quantity,
    balanceAfter: movement.balanceAfter,
    reason: movement.reason,
    note: movement.note,
    createdAt: movement.createdAt.toISOString(),
    createdBy: movement.createdBy,
  };
}

/**
 * O movimento novo. A autoria vem da identidade, nunca do corpo (CONTRIBUTING §8), e o saldo
 * chega CALCULADO por quem chamou: é o service que confere se a saída cabe, com o produto
 * travado.
 */
export function toInventoryMovementInsert(
  itemId: number,
  input: CreateInventoryMovementInput,
  balanceAfter: number,
  actorEmail: string,
): InventoryMovementInsert {
  return {
    itemId,
    type: input.type,
    quantity: Number(input.quantity),
    balanceAfter,
    /* O motivo só existe no descarte: mandado junto com uma entrada, é ruído — e o banco
       recusaria a linha (`inventory_movements_reason_matches_type`). */
    reason: input.type === 'disposal' ? (input.reason ?? null) : null,
    note: textOrNull(input.note) ?? null,
    createdBy: actorEmail,
  };
}

/** O produto novo. A autoria vem da identidade, nunca do corpo (CONTRIBUTING §8). */
export function toInventoryItemInsert(
  input: CreateInventoryItemInput,
  actorEmail: string,
  photoKey: string | null,
): InventoryItemInsert {
  return {
    name: input.name.trim(),
    category: input.category,
    unit: input.unit,
    location: textOrNull(input.location),
    code: textOrNull(input.code),
    note: textOrNull(input.note),
    photoKey,
    createdBy: actorEmail,
  };
}

/**
 * O que mudou — e só o que mudou.
 *
 * `setIfDefined` é o que separa "não mandou o campo" de "mandou vazio": o primeiro deixa como
 * está, o segundo apaga. Sem essa diferença, editar só o nome apagaria a observação.
 *
 * A foto tem três caminhos: não mexer (nada vem), trocar (`photoKey` com a imagem nova) e
 * tirar (`removePhoto`, que grava nulo).
 */
export function toInventoryItemUpdate(
  input: UpdateInventoryItemInput,
  actorEmail: string,
  photoKey?: string | null,
): Partial<InventoryItemInsert> {
  const values: Partial<InventoryItemInsert> = { updatedAt: new Date(), updatedBy: actorEmail };

  setIfDefined(values, 'name', input.name?.trim());
  setIfDefined(values, 'category', input.category);
  setIfDefined(values, 'unit', input.unit);
  setIfDefined(values, 'location', textOrNull(input.location));
  setIfDefined(values, 'code', textOrNull(input.code));
  setIfDefined(values, 'note', textOrNull(input.note));

  if (photoKey !== undefined) values.photoKey = photoKey;
  if (input.removePhoto) values.photoKey = null;

  return values;
}

/** Texto em branco vira nulo; ausente continua ausente, para o `setIfDefined` decidir. */
function textOrNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
}
