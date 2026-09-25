import { type Budget } from '@template/shared/schemas/budget.schema';

import { apiRequest } from './http-client';

/**
 * A chamada do Orçamento. Uma só: o servidor já cruza o parque com o depósito e faz o
 * desconto, em vez de a tela baixar as duas listas inteiras para subtrair no navegador.
 */
export const budgetApi = {
  summary: () => apiRequest<Budget>('/budget'),
};
