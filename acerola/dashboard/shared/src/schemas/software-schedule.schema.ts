import { z } from 'zod';

import {
  SCHEDULE_EVENT_CATEGORIES,
  SOFTWARE_PROJECT_COLORS,
} from '../domain/software-project.util';

export const scheduleCategorySchema = z.enum(SCHEDULE_EVENT_CATEGORIES);
export const scheduleColorSchema = z.enum(
  [...SOFTWARE_PROJECT_COLORS, 'neutral', 'red'] as const,
);

export const softwareScheduleEventSchema = z.object({
  id: z.number().int(),
  projectId: z.number().int().nullable(),
  projectName: z.string().nullable().optional(),
  title: z.string().min(1),
  category: scheduleCategorySchema,
  color: scheduleColorSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário no formato HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário no formato HH:mm'),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type SoftwareScheduleEvent = z.infer<typeof softwareScheduleEventSchema>;

export const createSoftwareScheduleEventSchema = z.object({
  projectId: z.number().int().optional().nullable(),
  title: z
    .string({ required_error: 'Informe o título do compromisso' })
    .trim()
    .min(1, 'Informe o título do compromisso'),
  category: scheduleCategorySchema.default('other'),
  color: scheduleColorSchema.default('blue'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inicial no formato HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário final no formato HH:mm'),
  note: z.string().trim().optional().nullable(),
});

export type CreateSoftwareScheduleEventInput = z.infer<typeof createSoftwareScheduleEventSchema>;

export const updateSoftwareScheduleEventSchema = createSoftwareScheduleEventSchema.partial();
export type UpdateSoftwareScheduleEventInput = z.infer<typeof updateSoftwareScheduleEventSchema>;

export const softwareScheduleQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type SoftwareScheduleQuery = z.infer<typeof softwareScheduleQuerySchema>;

export const softwareScheduleFormSchema = z.object({
  projectId: z.number().int().nullable().optional(),
  title: z.string().trim().min(1, 'Informe o título do compromisso'),
  category: scheduleCategorySchema,
  color: scheduleColorSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Início no formato HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Fim no formato HH:mm'),
  note: z.string().trim().optional(),
});

export type SoftwareScheduleForm = z.infer<typeof softwareScheduleFormSchema>;
