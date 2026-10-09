import {
  type CreateSoftwareProjectInput,
  type SoftwareProject,
  type SoftwareProjectListQuery,
  type UpdateSoftwareProjectInput,
} from '@template/shared/schemas/software-project.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';

import { apiRequest } from './http-client';

export const softwareProjectsApi = {
  list: (query: Partial<SoftwareProjectListQuery> = {}) =>
    apiRequest<Paginated<SoftwareProject>>('/software-projects', {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        status: query.status,
      },
    }),

  get: (id: number) => apiRequest<SoftwareProject>(`/software-projects/${id}`),

  create: (input: CreateSoftwareProjectInput) =>
    apiRequest<SoftwareProject>('/software-projects', {
      method: 'POST',
      body: input,
    }),

  update: (id: number, input: UpdateSoftwareProjectInput) =>
    apiRequest<SoftwareProject>(`/software-projects/${id}`, {
      method: 'PATCH',
      body: input,
    }),

  remove: (id: number) =>
    apiRequest<void>(`/software-projects/${id}`, {
      method: 'DELETE',
    }),

  syncGithub: (id: number) =>
    apiRequest<{ synced: number; message: string }>(`/software-projects/${id}/sync-github`, {
      method: 'POST',
    }),
};
