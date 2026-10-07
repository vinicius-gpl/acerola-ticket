import {
  type CreateSoftwareTimelineEventInput,
  type SoftwareTimelineEvent,
  type SoftwareTimelineListQuery,
} from '@template/shared/schemas/software-timeline.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';

import { apiRequest } from './http-client';

export const softwareTimelineApi = {
  list: (query: Partial<SoftwareTimelineListQuery> = {}) =>
    apiRequest<Paginated<SoftwareTimelineEvent>>('/software-timeline', {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        projectId: query.projectId,
        type: query.type,
      },
    }),

  create: (input: CreateSoftwareTimelineEventInput) =>
    apiRequest<SoftwareTimelineEvent>('/software-timeline', {
      method: 'POST',
      body: input,
    }),
};
