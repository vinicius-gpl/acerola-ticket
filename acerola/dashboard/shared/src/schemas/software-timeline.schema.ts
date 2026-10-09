import { z } from 'zod';

import {
  TIMELINE_EVENT_STATUSES,
  TIMELINE_EVENT_TYPES,
} from '../domain/software-project.util';
import { paginationQuerySchema } from './pagination.schema';

export const timelineEventTypeSchema = z.enum(TIMELINE_EVENT_TYPES);
export const timelineEventStatusSchema = z.enum(TIMELINE_EVENT_STATUSES);

export const softwareTimelineEventSchema = z.object({
  id: z.number().int(),
  projectId: z.number().int(),
  projectName: z.string().nullable().optional(),
  type: timelineEventTypeSchema,
  externalId: z.string().nullable(),
  title: z.string().min(1),
  description: z.string().nullable(),
  url: z.string().nullable(),
  author: z.string().nullable(),
  status: timelineEventStatusSchema,
  eventDate: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type SoftwareTimelineEvent = z.infer<typeof softwareTimelineEventSchema>;

export const createSoftwareTimelineEventSchema = z.object({
  projectId: z.number().int(),
  type: timelineEventTypeSchema,
  externalId: z.string().trim().optional().nullable(),
  title: z.string().trim().min(1, 'Informe o título do evento'),
  description: z.string().trim().optional().nullable(),
  url: z.string().trim().url('Informe uma URL válida').optional().nullable(),
  author: z.string().trim().optional().nullable(),
  status: timelineEventStatusSchema.default('open'),
  eventDate: z.string().datetime().optional(),
});

export type CreateSoftwareTimelineEventInput = z.infer<typeof createSoftwareTimelineEventSchema>;

export const softwareTimelineListQuerySchema = paginationQuerySchema.extend({
  projectId: z.coerce.number().int().optional(),
  type: timelineEventTypeSchema.optional(),
});

export type SoftwareTimelineListQuery = z.infer<typeof softwareTimelineListQuerySchema>;
