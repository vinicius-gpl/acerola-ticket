import { type Department } from '@template/shared/domain/department.util';
import { type PartCondition } from '@template/shared/domain/part-catalog.util';
import {
  type CreatePartInput,
  type Part,
  type PartMovement,
  type UpdateMovementInput,
  type UpdatePartInput,
} from '@template/shared/schemas/part.schema';

import { setIfDefined } from '../../../lib/db/partial-update.util';
import { type PartMovementInsert } from '../../../lib/db/schema/part-movements.schema';
import { type PartInsert, type PartRow } from '../../../lib/db/schema/parts.schema';
import { type MovementWithRefs } from '../repository/parts.repository';

/** A tradução entre a linha do banco e o contrato. */
export function toPart(row: PartRow): Part {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    condition: row.condition,
    balance: row.balance,

    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    updatedBy: row.updatedBy,
  };
}

/**
 * A peça nova.
 *
 * **O saldo nasce em ZERO, sempre.** A quantidade inicial informada no cadastro vira a
 * primeira ENTRADA do extrato, gravada pelo service — nunca um saldo solto. É o que garante
 * que todo número da prateleira tenha uma linha que o explique.
 *
 * A autoria vem da identidade, nunca do corpo (CONTRIBUTING §8).
 */
export function toPartInsert(input: CreatePartInput, actorEmail: string): PartInsert {
  return {
    name: input.name.trim(),
    category: input.category,
    condition: input.condition,
    balance: 0,
    createdBy: actorEmail,
  };
}

export function toPartUpdate(input: UpdatePartInput, actorEmail: string): Partial<PartInsert> {
  const values: Partial<PartInsert> = { updatedAt: new Date(), updatedBy: actorEmail };

  setIfDefined(values, 'name', input.name?.trim());
  setIfDefined(values, 'category', input.category);
  setIfDefined(values, 'condition', input.condition);

  return values;
}

/**
 * A movimentação como a tela a recebe.
 *
 * O nome da peça e o da máquina vêm das tabelas delas a cada consulta, e não de cópias
 * guardadas aqui: peça renomeada e máquina renomeada aparecem com o nome novo em todo o
 * histórico.
 */
export function toMovement(row: MovementWithRefs): PartMovement {
  const { movement } = row;

  return {
    id: movement.id,
    partId: movement.partId,
    ...partOf(row),

    type: movement.type,
    quantity: movement.quantity,
    balanceAfter: movement.balanceAfter,

    computerId: movement.computerId,
    ...computerOf(row),

    handledBy: movement.handledBy,
    note: movement.note,

    createdAt: movement.createdAt.toISOString(),
    createdBy: movement.createdBy,
    updatedAt: movement.updatedAt?.toISOString() ?? null,
    updatedBy: movement.updatedBy,
  };
}

/**
 * A peça da linha. Separado porque cada `??` conta como decisão, e o mapper passava do teto
 * de complexidade sem ter nenhuma decisão de verdade dentro.
 */
function partOf({ part }: MovementWithRefs) {
  return {
    partName: part?.name ?? 'Peça removida',
    partCondition: (part?.condition as PartCondition | undefined) ?? 'new',
  };
}

/** A máquina da linha, quando existe — movimentação sem máquina é o caso normal. */
function computerOf({ computer }: MovementWithRefs) {
  return {
    computerName: computer?.name ?? null,
    computerDisplayName: computer?.displayName ?? null,
    computerDepartment: (computer?.department as Department | null) ?? null,
  };
}

/**
 * O que dá para corrigir numa movimentação: quem pegou e a observação.
 *
 * Quantidade e tipo não entram — nem aqui, nem no contrato. Corrigi-los reescreveria o saldo
 * de todas as linhas seguintes do extrato; movimentação lançada errada se exclui, e a
 * exclusão devolve o saldo.
 */
export function toMovementUpdate(
  input: UpdateMovementInput,
  actorEmail: string,
): Partial<PartMovementInsert> {
  const values: Partial<PartMovementInsert> = { updatedAt: new Date(), updatedBy: actorEmail };

  setIfDefined(values, 'handledBy', input.handledBy);
  setIfDefined(values, 'note', input.note);

  return values;
}
