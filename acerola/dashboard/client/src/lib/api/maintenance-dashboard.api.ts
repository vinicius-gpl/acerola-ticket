import { type MaintenanceDashboard } from '@template/shared/schemas/maintenance-dashboard.schema';

import { apiRequest } from './http-client';

/** O resumo do painel da Manutenção: inventário, depósito e orçamentos num pedido só. */
export const maintenanceDashboardApi = {
  summary: () => apiRequest<MaintenanceDashboard>('/maintenance-dashboard'),
};
