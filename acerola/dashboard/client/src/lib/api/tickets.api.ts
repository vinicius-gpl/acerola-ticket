import { type TicketArea } from '@template/shared/domain/ticket-catalog.util';
import { type TicketInvite } from '@template/shared/domain/ticket-invite.util';
import { type TicketAttachment } from '@template/shared/schemas/ticket-attachment.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';
import { type StagedFile } from '@template/shared/schemas/staged-file.schema';
import { type ReportFormat } from '@template/shared/schemas/report.schema';
import { type PublicServiceOrder } from '@template/shared/schemas/service-order.schema';
import {
  type TicketHistory,
  type TicketHistoryFormValues,
} from '@template/shared/schemas/ticket-history.schema';
import {
  type MyTicket,
  type OpenedTicket,
  type PublicTicket,
  type RequesterDefaults,
  type Ticket,
  type TicketAssigneeOption,
  type TicketNotice,
  type TicketFormValues,
  type TicketListQuery,
  type UpdateTicketInput,
} from '@template/shared/schemas/ticket.schema';
import { type WhatsappNotice } from '@template/shared/schemas/whatsapp-notice.schema';

import { apiDownload, apiRequest, type Downloaded, uploadFile } from './http-client';

/** Os indicadores do painel, como a API os devolve. */
export type TicketDashboard = {
  total: number;
  open: number;
  inProgress: number;
  /** Parados, esperando alguém de fora do TI — os dois estágios de espera somados. */
  waiting: number;
  /** Encerrados com o problema tratado — com e sem ressalva. */
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
  /** Lista pública e mínima dos sistemas válidos para vincular um chamado a uma Issue. */
  /** O chamado de um link de consulta — o link assinado que vai nas mensagens de WhatsApp. */
  findByAccessToken: (token: string) =>
    apiRequest<PublicTicket>(`/tickets/access/${encodeURIComponent(token)}`),

  /**
   * O que o formulário já traz preenchido: o nome e o e-mail da conta logada, e o telefone e o
   * departamento do último chamado dela.
   */
  requesterDefaults: () => apiRequest<RequesterDefaults>('/tickets/requester-defaults'),
  /** Os chamados que a pessoa logada abriu, mais recentes primeiro. */
  mine: () => apiRequest<MyTicket[]>('/tickets/mine'),

  /**
   * O convite de chamado: o link assinado que o bot de WhatsApp manda a quem escreve `/chamado`.
   * Devolve com quem a pessoa quer falar e o telefone dela, para o formulário abrir preenchido.
   */
  invite: (token: string) =>
    apiRequest<TicketInvite>(`/tickets/invites/${encodeURIComponent(token)}`),

  /** Quem pode ser o responsável por um chamado desta área — a lista do formulário. */
  assigneeOptions: (area: TicketArea) =>
    apiRequest<TicketAssigneeOption[]>('/tickets/assignee-options', { query: { area } }),

  /**
   * Avisa pelo WhatsApp que o chamado ficou pronto, pelo número do responsável. Devolve o
   * desfecho: quando não é `sent`, a tela oferece o link manual.
   */
  notifyReady: (id: number) =>
    apiRequest<TicketNotice>(`/tickets/${id}/whatsapp-notice`, { method: 'POST' }),

  whatsappNotices: (id: number) => apiRequest<WhatsappNotice[]>(`/tickets/${id}/whatsapp-notices`),

  retryWhatsappNotice: (id: number, noticeId: number) =>
    apiRequest<WhatsappNotice>(`/tickets/${id}/whatsapp-notices/${noticeId}/retry`, {
      method: 'POST',
    }),

  systemProjectOptions: () =>
    apiRequest<{ id: number; name: string }[]>('/tickets/system-project-options'),

  list: (query: Partial<TicketListQuery>) =>
    apiRequest<Paginated<Ticket>>('/tickets', {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        status: query.status,
        statusGroup: query.statusGroup,
        priority: query.priority,
        area: query.area,
        department: query.department,
        problemType: query.problemType,
        projectId: query.projectId,
      },
    }),

  /**
   * Os indicadores da fila. `area` é o contexto do menu (#13): sem ela, os números seriam a
   * soma das três áreas enquanto a lista logo abaixo mostra uma só.
   */
  dashboard: (area?: TicketArea) =>
    apiRequest<TicketDashboard>('/tickets/dashboard', { query: { area } }),

  /** As áreas que esta pessoa atende — alimenta o seletor de contexto do menu (#13). */
  myAreas: () => apiRequest<TicketArea[]>('/tickets/areas/mine'),

  /** Baixa o relatório com os MESMOS filtros da fila — sem página, é a lista inteira. */
  exportReport: (query: Partial<TicketListQuery>, format: ReportFormat): Promise<Downloaded> =>
    apiDownload('/tickets/export', {
      query: {
        format,
        search: query.search,
        status: query.status,
        statusGroup: query.statusGroup,
        priority: query.priority,
        area: query.area,
        department: query.department,
        problemType: query.problemType,
        projectId: query.projectId,
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
   * Abre um chamado.
   *
   * O print e os anexos vão primeiro, direto para o storage (link assinado); só então o chamado
   * é gravado, levando a chave de cada arquivo. Se um envio falhar, nada é gravado — e o que já
   * subiu fica na área temporária, que o servidor limpa no dia seguinte.
   */
  create: async (
    values: TicketFormValues,
    screenshot: File | null,
    attachments: readonly File[] = [],
  ) => {
    const sentScreenshot = screenshot
      ? await uploadFile('/tickets/upload-url', screenshot)
      : undefined;
    const sentAttachments = await Promise.all(
      attachments.map((file) => uploadFile('/tickets/upload-url', file)),
    );

    return apiRequest<OpenedTicket>('/tickets', {
      method: 'POST',
      body: toTicketBody(values, sentScreenshot, sentAttachments),
    });
  },

  /** Os arquivos de um chamado, pelo painel. */
  attachments: (ticketId: number) =>
    apiRequest<TicketAttachment[]>(`/tickets/${ticketId}/attachments`),

  /**
   * Junta arquivos a um chamado já aberto.
   *
   * Cada arquivo vai direto para o storage; depois, um registro só com todos: a API confere a
   * leva inteira antes de guardar qualquer um, e registrar de um em um deixaria o chamado num
   * meio-termo quando o terceiro fosse recusado.
   */
  attach: async (ticketId: number, files: readonly File[]) => {
    const attachments = await uploadAll(ticketId, files);

    return apiRequest<TicketAttachment[]>(`/tickets/${ticketId}/attachments`, {
      method: 'POST',
      body: { attachments },
    });
  },

  removeAttachment: (ticketId: number, attachmentId: number) =>
    apiRequest<void>(`/tickets/${ticketId}/attachments/${attachmentId}`, { method: 'DELETE' }),

  /** A linha do tempo de um chamado — a ordem de serviço. */
  histories: (ticketId: number) => apiRequest<TicketHistory[]>(`/tickets/${ticketId}/histories`),

  /**
   * Lança um histórico — é o que muda o estágio do chamado.
   *
   * Os arquivos vão primeiro, direto para o storage; o histórico é gravado levando a chave de
   * cada um. Ou existe o histórico COM os anexos dele, ou não existe histórico nenhum.
   */
  createHistory: async (
    ticketId: number,
    values: TicketHistoryFormValues,
    files: readonly File[] = [],
  ) => {
    const attachments = await uploadAll(ticketId, files);

    return apiRequest<TicketHistory>(`/tickets/${ticketId}/histories`, {
      method: 'POST',
      body: {
        type: values.type,
        description: values.description,
        isVisibleToRequester: values.isVisibleToRequester,
        minutesSpent: values.minutesSpent.trim(),
        attachments,
      },
    });
  },

  /**
   * EMITE a ordem de serviço do chamado, em PDF.
   *
   * `POST`, e não `GET`: a emissão registra a impressão digital do arquivo, para ele poder ser
   * conferido depois. Sem mudança no chamado desde a última, volta o mesmo documento.
   */
  serviceOrder: (ticketId: number): Promise<Downloaded> =>
    apiDownload(`/tickets/${ticketId}/service-order`, { method: 'POST' }),

  /** A conferência PÚBLICA de uma ordem de serviço emitida — pelo código inteiro ou o curto. */
  verifyServiceOrder: (reference: string) =>
    apiRequest<PublicServiceOrder>(`/service-orders/${encodeURIComponent(reference)}`),

  /** Consulta pública pelo protocolo. Devolve menos campos que o painel, de propósito. */
  findByProtocol: (protocol: string) =>
    apiRequest<PublicTicket>(`/tickets/protocol/${encodeURIComponent(protocol)}`),
};

/** Envia os arquivos de um chamado já aberto pelo link de quem atende. */
function uploadAll(ticketId: number, files: readonly File[]): Promise<StagedFile[]> {
  return Promise.all(
    files.map((file) => uploadFile(`/tickets/${ticketId}/attachments/upload-url`, file)),
  );
}

/** O corpo da abertura: os campos e as chaves dos arquivos já enviados. Vazio não vai. */
function toTicketBody(
  values: TicketFormValues,
  screenshot: StagedFile | undefined,
  attachments: StagedFile[],
): Record<string, unknown> {
  return {
    requesterName: values.requesterName,
    area: values.area,
    department: values.department,
    problemType: values.problemType,
    priority: values.priority,
    contactPhone: values.contactPhone,
    description: values.description,
    notifyWhatsapp: values.notifyWhatsapp,
    anydeskId: values.anydeskId || undefined,
    projectId: values.projectId || undefined,
    assigneeId: values.assigneeId || undefined,
    screenshot,
    attachments,
  };
}
