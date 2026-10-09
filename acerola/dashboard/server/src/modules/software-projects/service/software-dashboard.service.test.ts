import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type Database } from '../../../lib/db/db.type';
import { type SoftwareTimelineRepository } from '../repository/software-timeline.repository';
import { SoftwareDashboardService } from './software-dashboard.service';

const user: RequestUser = {
  id: '1',
  email: 'dev@empresa.com.br',
  name: 'Dev User',
  role: 'user',
};

describe('SoftwareDashboardService', () => {
  it('generates summary data for the current month', async () => {
    const mockQuery = {
      where: vi.fn().mockImplementation(() => Promise.resolve([])),
      then: (resolve: any, reject: any) => Promise.resolve([]).then(resolve, reject),
    };

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(mockQuery),
      }),
    };

    const mockTimelineRepo = {
      listRecent: vi.fn().mockResolvedValue([]),
    } as unknown as SoftwareTimelineRepository;

    const service = new SoftwareDashboardService(mockDb as unknown as Database, mockTimelineRepo);

    const dashboard = await service.summary(user);

    expect(dashboard).toHaveProperty('monthName');
    expect(dashboard).toHaveProperty('monthYear');
    expect(dashboard).toHaveProperty('projectsSummary');
    expect(dashboard).toHaveProperty('ticketsMonthSummary');
    expect(dashboard).toHaveProperty('weeklyTrend');
    expect(dashboard.weeklyTrend).toHaveLength(4);
    expect(dashboard).toHaveProperty('recentTimeline');
  });
});
