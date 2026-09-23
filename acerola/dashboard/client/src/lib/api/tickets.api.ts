import { type Paginated } from '@template/shared/schemas/pagination.schema';
import {
  type PublicTicket,
  type Ticket,
  type TicketFormValues,
  type TicketListQuery,
  type UpdateTicketInput,
} from '@template/shared/schemas/ticket.schema';

import { apiRequest } from './http-client';

/** Os indicadores do painel, como a API os devolve. */
export type TicketDashboard = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  cancelled: number;
  averageResolutionHours: number | null;
  byProblemType: { key: string; count: number }[];
  byDepartment: { key: string; count: number }[];
};

/**
 * Chamadas da API de chamados. Nada aqui decide nada — é a tradução de uma intenção em uma
 * requisição, para que os view-models não montem URL à mão.
 */
export const ticketsApi = {
  list: (query: Partial<TicketListQuery>) =>
    apiRequest<Paginated<Ticket>>('/tickets', {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        status: query.status,
        priority: query.priority,
        department: query.department,
        problemType: query.problemType,
      },
    }),

  dashboard: () => apiRequest<TicketDashboard>('/tickets/dashboard'),

  findById: (id: number) => apiRequest<Ticket>(`/tickets/${id}`),

  update: (id: number, body: UpdateTicketInput) =>
    apiRequest<Ticket>(`/tickets/${id}`, { method: 'PATCH', body }),

  /**
   * Abre um chamado — público, sem login.
   *
   * Vai como `FormData` porque o print viaja junto: um envio só significa que ou existe o
   * chamado COM a imagem, ou não existe chamado nenhum. Com dois envios, uma falha no meio
   * deixaria um chamado apontando para uma imagem que nunca subiu.
   */
  create: (values: TicketFormValues, screenshot: File | null) =>
    apiRequest<Ticket>('/tickets', { method: 'POST', body: toTicketFormData(values, screenshot) }),

  /** Consulta pública pelo protocolo. Devolve menos campos que o painel, de propósito. */
  findByProtocol: (protocol: string) =>
    apiRequest<PublicTicket>(`/tickets/protocol/${encodeURIComponent(protocol)}`),
};

function toTicketFormData(values: TicketFormValues, screenshot: File | null): FormData {
  const form = new FormData();

  form.set('requesterName', values.requesterName);
  form.set('department', values.department);
  form.set('problemType', values.problemType);
  form.set('priority', values.priority);
  form.set('contactPhone', values.contactPhone);
  form.set('description', values.description);
  /* Booleano vira texto no multipart; o contrato no `shared` lê "true" e `true` do mesmo jeito. */
  form.set('notifyWhatsapp', String(values.notifyWhatsapp));

  if (values.anydeskId) form.set('anydeskId', values.anydeskId);
  if (screenshot) form.set('screenshot', screenshot);

  return form;
}
