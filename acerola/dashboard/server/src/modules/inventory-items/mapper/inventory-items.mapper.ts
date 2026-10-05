import {
  type CreateInventoryItemInput,
  type InventoryItem,
  type UpdateInventoryItemInput,
} from '@template/shared/schemas/inventory-item.schema';

import { setIfDefined } from '../../../lib/db/partial-update.util';
import {
  type InventoryItemInsert,
  type InventoryItemRow,
} from '../../../lib/db/schema/inventory-items.schema';

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

    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    updatedBy: row.updatedBy,
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
