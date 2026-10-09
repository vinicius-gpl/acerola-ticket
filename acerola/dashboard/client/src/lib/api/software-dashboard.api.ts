import { type SoftwareDashboard } from '@template/shared/schemas/software-dashboard.schema';

import { apiRequest } from './http-client';

export const softwareDashboardApi = {
  summary: () => apiRequest<SoftwareDashboard>('/software-dashboard'),
};
