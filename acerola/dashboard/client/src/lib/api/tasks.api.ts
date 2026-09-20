import { type Paginated } from '@template/shared/schemas/pagination.schema';
import {
  type CreateTaskInput,
  type Task,
  type TaskListQuery,
  type UpdateTaskInput,
} from '@template/shared/schemas/task.schema';

import { apiRequest } from './http-client';

/**
 * Chamadas da API de tarefas. Nada aqui decide nada — é a tradução de uma intenção em uma
 * requisição, para que os view-models não montem URL à mão.
 */
export const tasksApi = {
  list: (query: Partial<TaskListQuery>) =>
    apiRequest<Paginated<Task>>('/tasks', {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        status: query.status,
      },
    }),

  findById: (id: number) => apiRequest<Task>(`/tasks/${id}`),

  create: (body: CreateTaskInput) => apiRequest<Task>('/tasks', { method: 'POST', body }),

  update: (id: number, body: UpdateTaskInput) =>
    apiRequest<Task>(`/tasks/${id}`, { method: 'PATCH', body }),

  remove: (id: number) => apiRequest<void>(`/tasks/${id}`, { method: 'DELETE' }),
};
