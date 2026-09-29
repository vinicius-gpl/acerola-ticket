import {
  type InstalledPart,
  type Transfer,
} from '@template/shared/schemas/transfer.schema';

import { type ComputerTransferRow } from '../../../lib/db/schema/computer-transfers.schema';
import { type InstalledPartRow } from '../repository/transfers.repository';

/**
 * A tradução entre a linha do banco e o contrato.
 *
 * Datas viram texto ISO aqui, num lugar só: cada rota formatando a sua é como a mesma data
 * sai "2026-09-25T12:00:00.000Z" numa tela e "Thu Sep 25 2026" em outra.
 */
export function toTransfer(row: ComputerTransferRow): Transfer {
  return {
    id: row.id,
    computerId: row.computerId,
    fromDepartment: row.fromDepartment,
    toDepartment: row.toDepartment,
    responsible: row.responsible,
    note: row.note,
    peripheralsLeftBehind: row.peripheralsLeftBehind,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
  };
}

export function toInstalledPart(row: InstalledPartRow): InstalledPart {
  return {
    partId: row.partId,
    name: row.name,
    category: row.category as InstalledPart['category'],
    quantity: row.quantity,
  };
}
