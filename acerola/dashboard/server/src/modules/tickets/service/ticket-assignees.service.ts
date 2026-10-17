import { Inject, Injectable } from '@nestjs/common';
import { TICKET_AREAS, type TicketArea } from '@template/shared/domain/ticket-catalog.util';
import { type TicketAssigneeOption } from '@template/shared/schemas/ticket.schema';
import { type DirectoryUser } from '@template/shared/schemas/user.schema';

import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { USER_DIRECTORY_PROVIDER } from '../../../lib/auth/user-directory.token';
import { type InternalRoleRow } from '../../../lib/db/schema/internal-roles.schema';
import { RolesRepository } from '../../roles/repository/roles.repository';

const ADMIN_ROLE = 'admin';
const SUPER_ADMIN_ROLE = 'superadmin';

/**
 * QUEM PODE SER O RESPONSÁVEL POR UM CHAMADO DE CADA ÁREA.
 *
 * São os admins daquela área, mais os super admins — que respondem pelas três. Admin de
 * Infraestrutura não aparece num chamado de Sistema: quem abre escolhe entre quem de fato
 * atende aquilo.
 *
 * O cargo por área vem dos cargos internos (`internal_roles`); o de super admin, do cadastro
 * do autenticador — a mesma combinação que a identidade de quem faz login usa.
 */
@Injectable()
export class TicketAssigneesService {
  constructor(
    @Inject(USER_DIRECTORY_PROVIDER) private readonly directory: UserDirectoryProvider,
    private readonly roles: RolesRepository,
  ) {}

  /** As pessoas que atendem `area`, em ordem alfabética. */
  async listForArea(area: TicketArea): Promise<TicketAssigneeOption[]> {
    const [users, roles] = await Promise.all([this.directory.listUsers(), this.roles.list()]);

    return users
      .filter((user) => !user.banned && areasOf(user, roles).includes(area))
      .map((user) => ({ id: user.id, name: displayName(user) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  /** A pessoa, SE ela atende `area`. Nulo é "não pode ser responsável por este chamado". */
  async resolve(area: TicketArea, userId: string): Promise<TicketAssigneeOption | null> {
    return (await this.listForArea(area)).find((option) => option.id === userId) ?? null;
  }

  /** As áreas que esta pessoa atende — vazio para quem não administra nenhuma. */
  async areasOf(userId: string): Promise<{ name: string; areas: TicketArea[] } | null> {
    const user = await this.directory.getUserById(userId);
    if (!user || user.banned) return null;

    return { name: displayName(user), areas: areasOf(user, await this.roles.list()) };
  }
}

function areasOf(user: DirectoryUser, roles: readonly InternalRoleRow[]): TicketArea[] {
  if (user.role === SUPER_ADMIN_ROLE) return [...TICKET_AREAS];

  /* Só pelo id da conta: um e-mail antigo passado para outra pessoa não pode levar junto as
     áreas de quem o usava. */
  const own = roles.filter((role) => role.userId === user.id);

  return TICKET_AREAS.filter((area) =>
    own.some((role) => role.context === area && role.role === ADMIN_ROLE),
  );
}

function displayName(user: DirectoryUser): string {
  return user.name.trim() || user.email;
}
