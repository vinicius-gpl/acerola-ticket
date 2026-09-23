import {
  type CreateMaintenanceInput,
  type Maintenance,
  type MaintenanceListQuery,
  type PreventiveDue,
  type UpdateMaintenanceInput,
} from '@template/shared/schemas/maintenance.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';

import { apiRequest } from './http-client';

/**
 * Chamadas da API de manutenções. Nada aqui decide nada — é a tradução de uma intenção em
 * uma requisição, para que os view-models não montem URL à mão.
 */
export const maintenancesApi = {
  list: (query: Partial<MaintenanceListQuery>) =>
    apiRequest<Paginated<Maintenance>>('/maintenances', {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        computerId: query.computerId,
        type: query.type,
      },
    }),

  /** A situação da preventiva de cada máquina do inventário — calculada a cada consulta. */
  preventive: () => apiRequest<PreventiveDue[]>('/maintenances/preventive'),

  findById: (id: number) => apiRequest<Maintenance>(`/maintenances/${id}`),

  create: (body: CreateMaintenanceInput) =>
    apiRequest<Maintenance>('/maintenances', { method: 'POST', body }),

  update: (id: number, body: UpdateMaintenanceInput) =>
    apiRequest<Maintenance>(`/maintenances/${id}`, { method: 'PATCH', body }),

  remove: (id: number) => apiRequest<void>(`/maintenances/${id}`, { method: 'DELETE' }),
};
