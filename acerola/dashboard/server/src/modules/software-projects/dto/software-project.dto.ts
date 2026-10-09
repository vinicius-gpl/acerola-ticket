import {
  createSoftwareProjectSchema,
  softwareProjectListQuerySchema,
  softwareProjectSchema,
  updateSoftwareProjectSchema,
} from '@template/shared/schemas/software-project.schema';
import {
  createSoftwareTimelineEventSchema,
  softwareTimelineListQuerySchema,
  softwareTimelineEventSchema,
} from '@template/shared/schemas/software-timeline.schema';
import {
  createSoftwareScheduleEventSchema,
  softwareScheduleEventSchema,
  softwareScheduleQuerySchema,
  updateSoftwareScheduleEventSchema,
} from '@template/shared/schemas/software-schedule.schema';
import { softwareDashboardSchema } from '@template/shared/schemas/software-dashboard.schema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class SoftwareProjectDto extends createZodDto(softwareProjectSchema) {}
export class CreateSoftwareProjectDto extends createZodDto(createSoftwareProjectSchema) {}
export class UpdateSoftwareProjectDto extends createZodDto(updateSoftwareProjectSchema) {}
export class SoftwareProjectListQueryDto extends createZodDto(softwareProjectListQuerySchema) {}

export class SoftwareProjectListResponseDto extends createZodDto(
  z.object({
    items: z.array(softwareProjectSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
) {}

export class SoftwareTimelineEventDto extends createZodDto(softwareTimelineEventSchema) {}
export class CreateSoftwareTimelineEventDto extends createZodDto(createSoftwareTimelineEventSchema) {}
export class SoftwareTimelineListQueryDto extends createZodDto(softwareTimelineListQuerySchema) {}

export class SoftwareTimelineListResponseDto extends createZodDto(
  z.object({
    items: z.array(softwareTimelineEventSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
) {}

export class SoftwareScheduleEventDto extends createZodDto(softwareScheduleEventSchema) {}
export class CreateSoftwareScheduleEventDto extends createZodDto(createSoftwareScheduleEventSchema) {}
export class UpdateSoftwareScheduleEventDto extends createZodDto(updateSoftwareScheduleEventSchema) {}
export class SoftwareScheduleQueryDto extends createZodDto(softwareScheduleQuerySchema) {}

export class SoftwareDashboardDto extends createZodDto(softwareDashboardSchema) {}
