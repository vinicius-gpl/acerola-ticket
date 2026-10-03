import { type TicketArea } from '@template/shared/domain/ticket-catalog.util';
import { type TicketAttachment } from '@template/shared/schemas/ticket-attachment.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';
import { type ReportFormat } from '@template/shared/schemas/report.schema';
import {
  type PublicTicket,
  type Ticket,
  type TicketFormValues,
  type TicketListQuery,
  type UpdateTicketInput,
} from '@template/shared/schemas/ticket.schema';

import { apiDownload, apiRequest, type Downloaded } from './http-client';

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
        area: query.area,
        department: query.department,
        problemType: query.problemType,
      },
    }),

  dashboard: () => apiRequest<TicketDashboard>('/tickets/dashboard'),

  /** As áreas que esta pessoa atende — alimenta o seletor de contexto do menu (#13). */
  myAreas: () => apiRequest<TicketArea[]>('/tickets/areas/mine'),

  /** Baixa o relatório com os MESMOS filtros da fila — sem página, é a lista inteira. */
  exportReport: (query: Partial<TicketListQuery>, format: ReportFormat): Promise<Downloaded> =>
    apiDownload('/tickets/export', {
      query: {
        format,
        search: query.search,
        status: query.status,
        priority: query.priority,
        area: query.area,
        department: query.department,
        problemType: query.problemType,
      },
    }),

  findById: (id: number) => apiRequest<Ticket>(`/tickets/${id}`),

  update: (id: number, body: UpdateTicketInput) =>
    apiRequest<Ticket>(`/tickets/${id}`, { method: 'PATCH', body }),

  /** Soma uma área PARTICIPANTE ao chamado (#13) — a área original não muda. */
  addArea: (id: number, area: TicketArea) =>
    apiRequest<Ticket>(`/tickets/${id}/areas`, { method: 'POST', body: { area } }),

  /** Tira uma área participante. A área original nunca sai por aqui. */
  removeArea: (id: number, area: TicketArea) =>
    apiRequest<Ticket>(`/tickets/${id}/areas/${area}`, { method: 'DELETE' }),

  /**
   * Abre um chamado — público, sem login.
   *
   * Vai como `FormData` porque o print viaja junto: um envio só significa que ou existe o
   * chamado COM a imagem, ou não existe chamado nenhum. Com dois envios, uma falha no meio
   * deixaria um chamado apontando para uma imagem que nunca subiu.
   */
  create: (values: TicketFormValues, screenshot: File | null, attachments: readonly File[] = []) =>
    apiRequest<Ticket>('/tickets', {
      method: 'POST',
      body: toTicketFormData(values, screenshot, attachments),
    }),

  /** Os arquivos de um chamado, pelo painel. */
  attachments: (ticketId: number) =>
    apiRequest<TicketAttachment[]>(`/tickets/${ticketId}/attachments`),

  /**
   * Junta arquivos a um chamado já aberto.
   *
   * Um envio só com todos: a API confere a leva inteira antes de guardar qualquer um, e
   * mandar de um em um deixaria o chamado num meio-termo quando o terceiro fosse recusado.
   */
  attach: (ticketId: number, files: readonly File[]) => {
    const form = new FormData();
    for (const file of files) form.append('attachments', file);

    return apiRequest<TicketAttachment[]>(`/tickets/${ticketId}/attachments`, {
      method: 'POST',
      body: form,
    });
  },

  removeAttachment: (ticketId: number, attachmentId: number) =>
    apiRequest<void>(`/tickets/${ticketId}/attachments/${attachmentId}`, { method: 'DELETE' }),

  /** Consulta pública pelo protocolo. Devolve menos campos que o painel, de propósito. */
  findByProtocol: (protocol: string) =>
    apiRequest<PublicTicket>(`/tickets/protocol/${encodeURIComponent(protocol)}`),
};

function toTicketFormData(
  values: TicketFormValues,
  screenshot: File | null,
  attachments: readonly File[],
): FormData {
  const form = new FormData();

  form.set('requesterName', values.requesterName);
  form.set('area', values.area);
  form.set('department', values.department);
  form.set('problemType', values.problemType);
  form.set('priority', values.priority);
  form.set('contactPhone', values.contactPhone);
  form.set('description', values.description);
  /* Booleano vira texto no multipart; o contrato no `shared` lê "true" e `true` do mesmo jeito. */
  form.set('notifyWhatsapp', String(values.notifyWhatsapp));

  if (values.anydeskId) form.set('anydeskId', values.anydeskId);
  if (screenshot) form.set('screenshot', screenshot);
  /* `append`, e não `set`: são vários no mesmo campo, e `set` deixaria só o último. */
  for (const attachment of attachments) form.append('attachments', attachment);

  return form;
}
