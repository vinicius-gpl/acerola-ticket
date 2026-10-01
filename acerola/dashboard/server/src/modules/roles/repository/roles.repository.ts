import { Inject, Injectable } from '@nestjs/common';
import { asc, desc, eq, or } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  internalRoles,
  type InternalRoleInsert,
  type InternalRoleRow,
} from '../../../lib/db/schema/internal-roles.schema';

/**
 * Acesso ao banco de dados para a tabela `internal_roles`.
 * O repository não tem regra de negócio: toda política de acesso mora no service.
 */
@Injectable()
export class RolesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(): Promise<InternalRoleRow[]> {
    return runQuery(
      this.db
        .select()
        .from(internalRoles)
        .orderBy(desc(internalRoles.createdAt), desc(internalRoles.id)),
      'listar cargos internos',
    );
  }

  async findById(id: number): Promise<InternalRoleRow | null> {
    return runMaybe(
      this.db.select().from(internalRoles).where(eq(internalRoles.id, id)).limit(1),
      'ler cargo interno',
    );
  }

  async findByUserIdOrEmail(identifier: string): Promise<InternalRoleRow[]> {
    return runQuery(
      this.db
        .select()
        .from(internalRoles)
        .where(or(eq(internalRoles.userId, identifier), eq(internalRoles.userEmail, identifier)))
        .orderBy(asc(internalRoles.context)),
      'listar cargos da pessoa',
    );
  }

  async upsert(values: InternalRoleInsert): Promise<InternalRoleRow> {
    const [row] = await runQuery(
      this.db
        .insert(internalRoles)
        .values(values)
        .onConflictDoUpdate({
          target: [internalRoles.userId, internalRoles.context],
          set: {
            role: values.role,
            userEmail: values.userEmail,
            updatedAt: new Date(),
            updatedBy: values.updatedBy,
          },
        })
        .returning(),
      'salvar cargo interno',
    );

    return row as InternalRoleRow;
  }

  async delete(id: number): Promise<void> {
    await runQuery(this.db.delete(internalRoles).where(eq(internalRoles.id, id)), 'excluir cargo interno');
  }
}
