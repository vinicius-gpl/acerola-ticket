import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type AssignRoleInput,
  type InternalRole,
} from '@template/shared/schemas/internal-role.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { assertIsAdmin, assertIsSuperAdmin } from '../../../lib/policy/policy-assert.util';
import { toInternalRole, toInternalRoleInsert } from '../mapper/roles.mapper';
import { RolesRepository } from '../repository/roles.repository';

/**
 * Regras de negócio para cargos internos.
 * Consulta permitida para Administrador e Super Administrador.
 * Atribuição e exclusão são exclusivas de Super Administrador (quem dá os cadastros).
 * O cargo de Super Administrador não pode ser atribuído pela interface, apenas via comando CLI.
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
    assertIsSuperAdmin(actor.role, 'Atribuir cargo interno');

    if ((input.role as string) === 'superadmin') {
      throw new ForbiddenException(
        'O cargo de Super Administrador só pode ser concedido via comando de terminal.',
      );
    }

    const insert = toInternalRoleInsert(input, actor.email);
    const row = await this.repository.upsert(insert);

    return toInternalRole(row);
  }

  async delete(actor: RequestUser, id: number): Promise<void> {
    assertIsSuperAdmin(actor.role, 'Excluir cargo interno');

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Cargo interno não encontrado.');
    }

    await this.repository.delete(id);
  }
}
