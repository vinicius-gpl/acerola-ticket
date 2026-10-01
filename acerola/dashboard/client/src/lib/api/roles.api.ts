import {
  type AssignRoleInput,
  type InternalRole,
} from '@template/shared/schemas/internal-role.schema';
import { type DirectoryUser } from '@template/shared/schemas/user.schema';

import { apiRequest } from './http-client';

/**
 * Chamadas da API para gerenciamento de cargos internos.
 */
export const rolesApi = {
  list: () => apiRequest<InternalRole[]>('/roles'),

  listUsers: () => apiRequest<DirectoryUser[]>('/roles/users'),

  listByUser: (identifier: string) =>
    apiRequest<InternalRole[]>(`/roles/user/${encodeURIComponent(identifier)}`),

  assign: (body: AssignRoleInput) => apiRequest<InternalRole>('/roles', { method: 'POST', body }),

  remove: (id: number) => apiRequest<void>(`/roles/${id}`, { method: 'DELETE' }),
};
