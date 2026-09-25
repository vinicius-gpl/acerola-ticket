import { type Insights } from '@template/shared/schemas/insight.schema';

import { apiRequest } from './http-client';

/**
 * A chamada da Inteligência. Uma só: o servidor já cruza inventário, telemetria e manutenção
 * e aplica as réguas, em vez de a tela baixar tudo para decidir no navegador.
 */
export const insightsApi = {
  summary: (days: number) => apiRequest<Insights>('/insights', { query: { days } }),
};
