import { type Dashboard } from '@template/shared/schemas/dashboard.schema';

import { apiRequest } from './http-client';

/**
 * A chamada do painel. Uma só: o servidor já entrega o resumo cruzado das quatro áreas, em
 * vez de a tela buscar quatro listas inteiras para contá-las no navegador.
 */
export const dashboardApi = {
  summary: (days: number) => apiRequest<Dashboard>('/dashboard', { query: { days } }),
};
