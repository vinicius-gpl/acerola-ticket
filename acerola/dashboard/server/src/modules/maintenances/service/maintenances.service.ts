import { Injectable, NotFoundException } from '@nestjs/common';
import { type Department } from '@template/shared/domain/department.util';
import { preventiveStatusOf } from '@template/shared/domain/maintenance.util';
import {
  type CreateMaintenanceInput,
  type Maintenance,
  type MaintenanceListQuery,
  type PreventiveDue,
  type UpdateMaintenanceInput,
} from '@template/shared/schemas/maintenance.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  assertCanCreate,
  assertCanModifyRecord,
  assertCanRead,
} from '../../../lib/policy/policy-assert.util';
import { toMaintenance, toMaintenanceInsert, toMaintenanceUpdate } from '../mapper/maintenances.mapper';
import {
  MaintenancesRepository,
  type MaintenanceWithComputer,
  type PreventiveRow,
} from '../repository/maintenances.repository';

const NOT_FOUND = 'Manutenção não encontrada. Ela pode ter sido excluída — recarregue a lista.';

/**
 * O ÚNICO caminho de escrita de manutenção. Controller não fala com repository, e o
 * repository não decide nada.
 *
 * A policy é chamada AQUI, colada na escrita: esquecer de chamá-la é uma porta aberta, e ela
 * fica mais difícil de esquecer no mesmo lugar do `insert`.
 */
@Injectable()
export class MaintenancesService {
  constructor(private readonly repository: MaintenancesRepository) {}

  async list(user: RequestUser, query: MaintenanceListQuery): Promise<Paginated<Maintenance>> {
    assertCanRead(user.role, 'as manutenções');

    const page = await this.repository.list(query);

    return {
      items: page.rows.map(toMaintenance),
      total: page.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(user: RequestUser, id: number): Promise<Maintenance> {
    assertCanRead(user.role, 'as manutenções');

    return toMaintenance(await this.requireMaintenance(id));
  }

  async create(user: RequestUser, input: CreateMaintenanceInput): Promise<Maintenance> {
    assertCanCreate(user.role, 'manutenções');

    const id = await this.repository.insert(toMaintenanceInsert(input, user.email));

    /* Relê para devolver a máquina junto: o insert conhece o `computer_id`, mas não o nome
       dela, e a tela precisa do nome para desenhar a linha que acabou de aparecer. */
    return toMaintenance(await this.requireMaintenance(id));
  }

  async update(user: RequestUser, id: number, input: UpdateMaintenanceInput): Promise<Maintenance> {
    assertCanRead(user.role, 'as manutenções');

    const current = await this.requireMaintenance(id);

    /* A policy vem DEPOIS de achar o registro: sem saber quem o criou não dá para responder
       "é seu?". A leitura já foi liberada acima, então nada vaza nessa ordem. */
    assertCanModifyRecord(user.role, user.email, current.maintenance.createdBy, 'Esta manutenção');

    await this.repository.update(id, toMaintenanceUpdate(input, user.email));

    return toMaintenance(await this.requireMaintenance(id));
  }

  async remove(user: RequestUser, id: number): Promise<void> {
    assertCanRead(user.role, 'as manutenções');

    const current = await this.requireMaintenance(id);
    assertCanModifyRecord(user.role, user.email, current.maintenance.createdBy, 'Esta manutenção');

    await this.repository.delete(id);
  }

  /**
   * O quadro de preventivas: quais máquinas passaram do prazo.
   *
   * A situação é CALCULADA a cada consulta, nunca guardada: como campo, uma máquina ficaria
   * presa em "em dia" para sempre, porque ninguém fica vivo para reescrever o campo no dia em
   * que o prazo vira.
   *
   * A ordem é a do trabalho: primeiro quem está vencida ou nunca foi aberta, e dentro disso a
   * que está parada há mais tempo.
   */
  async preventive(user: RequestUser): Promise<PreventiveDue[]> {
    assertCanRead(user.role, 'as manutenções');

    const rows = await this.repository.listPreventive();

    return rows.map(toPreventiveDue).sort(byUrgency);
  }

  private async requireMaintenance(id: number): Promise<MaintenanceWithComputer> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException(NOT_FOUND);

    return row;
  }
}

function toPreventiveDue(row: PreventiveRow): PreventiveDue {
  const lastDoneAt = row.lastDoneAt ? new Date(row.lastDoneAt).toISOString() : null;

  return {
    computerId: row.computerId,
    computerName: row.computerName,
    computerDisplayName: row.computerDisplayName,
    computerDepartment: (row.computerDepartment as Department | null) ?? null,
    lastDoneAt,
    status: preventiveStatusOf(lastDoneAt),
    maintenanceCount: row.maintenanceCount,
  };
}

/** Vencida e nunca feita vêm primeiro; entre elas, a que está parada há mais tempo. */
const STATUS_ORDER = { due: 0, never: 1, ok: 2 } as const;

function byUrgency(a: PreventiveDue, b: PreventiveDue): number {
  const order = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  if (order !== 0) return order;

  /* Sem data nenhuma, o desempate é o nome: inventar uma data faria a ordem mudar a cada
     consulta, e a lista dançaria na frente de quem está trabalhando nela. */
  if (!a.lastDoneAt || !b.lastDoneAt) return a.computerName.localeCompare(b.computerName, 'pt-BR');

  return Date.parse(a.lastDoneAt) - Date.parse(b.lastDoneAt);
}
