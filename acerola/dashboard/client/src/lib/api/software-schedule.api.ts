import {
  type CreateSoftwareScheduleEventInput,
  type SoftwareScheduleEvent,
  type SoftwareScheduleQuery,
  type UpdateSoftwareScheduleEventInput,
} from '@template/shared/schemas/software-schedule.schema';

import { apiRequest } from './http-client';

export const softwareScheduleApi = {
  list: (query: SoftwareScheduleQuery) =>
    apiRequest<SoftwareScheduleEvent[]>('/software-schedule', {
      query: {
        startDate: query.startDate,
        endDate: query.endDate,
      },
    }),

  get: (id: number) => apiRequest<SoftwareScheduleEvent>(`/software-schedule/${id}`),

  create: (input: CreateSoftwareScheduleEventInput) =>
    apiRequest<SoftwareScheduleEvent>('/software-schedule', {
      method: 'POST',
      body: input,
    }),

  update: (id: number, input: UpdateSoftwareScheduleEventInput) =>
    apiRequest<SoftwareScheduleEvent>(`/software-schedule/${id}`, {
      method: 'PATCH',
      body: input,
    }),

  remove: (id: number) =>
    apiRequest<void>(`/software-schedule/${id}`, {
      method: 'DELETE',
    }),
};
