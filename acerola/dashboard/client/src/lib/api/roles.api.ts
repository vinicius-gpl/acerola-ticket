import {
  type AssignRoleInput,
  type InternalRole,
} from '@template/shared/schemas/internal-role.schema';

import { apiRequest } from './http-client';

/**
 * Chamadas da API para gerenciamento de cargos internos.
 */
export const rolesApi = {
  list: () => apiRequest<InternalRole[]>('/roles'),

  listByUser: (identifier: string) =>
    apiRequest<InternalRole[]>(`/roles/user/${encodeURIComponent(identifier)}`),

  assign: (body: AssignRoleInput) => apiRequest<InternalRole>('/roles', { method: 'POST', body }),

  remove: (id: number) => apiRequest<void>(`/roles/${id}`, { method: 'DELETE' }),
};
