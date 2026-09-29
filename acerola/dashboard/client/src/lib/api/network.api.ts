import {
  type CreateNetworkEventInput,
  type NetworkEvent,
  type NetworkEventListQuery,
  type NetworkSummary,
} from '@template/shared/schemas/network-event.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';

import { apiRequest } from './http-client';

/**
 * Chamadas da API de rede. Nada aqui decide nada — é a tradução de uma intenção em uma
 * requisição, para que os view-models não montem URL à mão.
 *
 * O webhook do UniFi NÃO está aqui: quem o chama é o controlador da rede, de fora, sem
 * passar por esta tela.
 */
export const networkApi = {
  list: (query: Partial<NetworkEventListQuery>) =>
    apiRequest<Paginated<NetworkEvent>>('/network/events', {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        type: query.type,
        severity: query.severity,
        onlyOpen: query.onlyOpen,
        days: query.days,
      },
    }),

  summary: (days: number) => apiRequest<NetworkSummary>('/network/summary', { query: { days } }),

  /** Registrar uma queda à mão — a do provedor que ligou avisando. */
  create: (body: CreateNetworkEventInput) =>
    apiRequest<NetworkEvent>('/network/events', { method: 'POST', body }),

  /** Marca como resolvido, ou reabre. O evento continua no histórico nos dois casos. */
  resolve: (id: number, isResolved: boolean) =>
    apiRequest<NetworkEvent>(`/network/events/${id}/resolution`, {
      method: 'PATCH',
      body: { isResolved },
    }),
};
