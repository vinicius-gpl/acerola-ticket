import { z } from 'zod';

import { softwareTimelineEventSchema } from './software-timeline.schema';

export const softwareDashboardSchema = z.object({
  monthName: z.string(),
  monthYear: z.string(),
  projectsSummary: z.object({
    total: z.number().int(),
    active: z.number().int(),
    maintenance: z.number().int(),
    deprecated: z.number().int(),
  }),
  ticketsMonthSummary: z.object({
    opened: z.number().int(),
    resolved: z.number().int(),
    pending: z.number().int(),
    resolutionRate: z.number(), // porcentagem ex: 85.5
    averageResolutionHours: z.number().nullable(),
  }),
  ticketsByProblemType: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      count: z.number().int(),
    }),
  ),
  prsMonthSummary: z.object({
    opened: z.number().int(),
    merged: z.number().int(),
    total: z.number().int(),
  }),
  weeklyTrend: z.array(
    z.object({
      weekLabel: z.string(),
      openedTickets: z.number().int(),
      resolvedTickets: z.number().int(),
      pullRequests: z.number().int(),
    }),
  ),
  recentTimeline: z.array(softwareTimelineEventSchema),
});

export type SoftwareDashboard = z.infer<typeof softwareDashboardSchema>;
