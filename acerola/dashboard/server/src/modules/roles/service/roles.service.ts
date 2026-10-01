import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type AssignRoleInput,
  type InternalRole,
} from '@template/shared/schemas/internal-role.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { assertIsAdmin } from '../../../lib/policy/policy-assert.util';
import { toInternalRole, toInternalRoleInsert } from '../mapper/roles.mapper';
import { RolesRepository } from '../repository/roles.repository';

/**
 * Regras de negócio para cargos internos.
 * Apenas quem possui perfil de Administrador (`admin`) pode consultar, atribuir ou remover cargos.
 */
@Injectable()
export class RolesService {
  constructor(private readonly repository: RolesRepository) {}

  async list(actor: RequestUser): Promise<InternalRole[]> {
    assertIsAdmin(actor.role, 'Consultar cargos internos');

    const rows = await this.repository.list();
    return rows.map(toInternalRole);
  }

  async listByUser(actor: RequestUser, identifier: string): Promise<InternalRole[]> {
    assertIsAdmin(actor.role, 'Consultar cargos da pessoa');

    const rows = await this.repository.findByUserIdOrEmail(identifier.trim());
    return rows.map(toInternalRole);
  }

  async assign(actor: RequestUser, input: AssignRoleInput): Promise<InternalRole> {
    assertIsAdmin(actor.role, 'Atribuir cargo interno');

    const insert = toInternalRoleInsert(input, actor.email);
    const row = await this.repository.upsert(insert);

    return toInternalRole(row);
  }

  async delete(actor: RequestUser, id: number): Promise<void> {
    assertIsAdmin(actor.role, 'Excluir cargo interno');

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Cargo interno não encontrado.');
    }

    await this.repository.delete(id);
  }
}
