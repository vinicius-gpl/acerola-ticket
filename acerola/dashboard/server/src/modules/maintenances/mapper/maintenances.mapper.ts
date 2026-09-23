import { type Department } from '@template/shared/domain/department.util';
import {
  type CreateMaintenanceInput,
  type Maintenance,
  type UpdateMaintenanceInput,
} from '@template/shared/schemas/maintenance.schema';

import { setIfDefined } from '../../../lib/db/partial-update.util';
import { type MaintenanceInsert } from '../../../lib/db/schema/maintenances.schema';
import { type MaintenanceWithComputer } from '../repository/maintenances.repository';

/**
 * A tradução entre a linha do banco e o contrato.
 *
 * O nome da máquina vem do INVENTÁRIO (o `leftJoin`), não de uma cópia guardada na
 * manutenção: máquina renomeada aparece com o nome novo em todo o histórico dela.
 */
export function toMaintenance(row: MaintenanceWithComputer): Maintenance {
  const { maintenance, computer } = row;

  return {
    id: maintenance.id,

    computerId: maintenance.computerId,
    computerName: computer?.name ?? null,
    computerDisplayName: computer?.displayName ?? null,
    computerDepartment: (computer?.department as Department | null) ?? null,
    otherMachine: maintenance.otherMachine,

    type: maintenance.type,
    description: maintenance.description,
    performedBy: maintenance.performedBy,
    performedAt: maintenance.performedAt.toISOString(),

    createdAt: maintenance.createdAt.toISOString(),
    createdBy: maintenance.createdBy,
    updatedAt: maintenance.updatedAt?.toISOString() ?? null,
    updatedBy: maintenance.updatedBy,
  };
}

/**
 * O registro novo.
 *
 * **A autoria vem da identidade, nunca do corpo** (CONTRIBUTING §8): `createdBy` é carimbado
 * aqui a partir de quem está autenticado. `performedBy` é outra coisa — é texto livre, o nome
 * de quem pôs a mão na máquina, que pode ser alguém de fora e sem login.
 *
 * Quando a máquina vem do inventário, o equipamento digitado à mão é DESCARTADO: guardar os
 * dois deixaria a linha dizendo duas coisas diferentes sobre o mesmo serviço.
 */
export function toMaintenanceInsert(
  input: CreateMaintenanceInput,
  actorEmail: string,
): MaintenanceInsert {
  const computerId = input.computerId ?? null;

  return {
    computerId,
    otherMachine: computerId ? null : (input.otherMachine ?? null),
    type: input.type,
    description: input.description ?? null,
    performedBy: input.performedBy ?? null,
    performedAt: new Date(input.performedAt),
    createdBy: actorEmail,
  };
}

/**
 * A edição, campo a campo: só o que veio no corpo é tocado.
 *
 * `setIfDefined` existe para separar "não mandou" de "mandou vazio" — sem ele, corrigir só a
 * data apagaria a descrição de quem escreveu o que foi feito.
 */
export function toMaintenanceUpdate(
  input: UpdateMaintenanceInput,
  actorEmail: string,
): Partial<MaintenanceInsert> {
  const values: Partial<MaintenanceInsert> = { updatedAt: new Date(), updatedBy: actorEmail };

  setIfDefined(values, 'type', input.type);
  setIfDefined(values, 'description', input.description);
  setIfDefined(values, 'performedBy', input.performedBy);

  if (input.performedAt !== undefined) values.performedAt = new Date(input.performedAt);

  /* Trocar a máquina troca também o outro lado: ao apontar para o inventário, o equipamento
     digitado à mão sai; ao voltar para um equipamento de fora, o vínculo sai. */
  if (input.computerId !== undefined) {
    values.computerId = input.computerId;
    if (input.computerId) values.otherMachine = null;
  }

  if (input.otherMachine !== undefined && !values.computerId) {
    values.otherMachine = input.otherMachine ?? null;
  }

  return values;
}
