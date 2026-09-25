import {
  type Computer,
  type ComputerAlert,
  type ComputerListQuery,
  type DisposeComputerInput,
  type ComputerSample,
  type CreateComputerInput,
  type CreatedComputer,
  type UpdateComputerInput,
} from '@template/shared/schemas/computer.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';

import { apiRequest } from './http-client';

/**
 * Chamadas da API de computadores. Nada aqui decide nada — é a tradução de uma intenção em
 * uma requisição, para que os view-models não montem URL à mão.
 *
 * Não existe `remove`: máquina que saiu de uso é ARQUIVADA (`update` com `isArchived`). O
 * histórico dela é o que sustenta "esta aqui deu problema demais, vamos trocar".
 */
export const computersApi = {
  list: (query: Partial<ComputerListQuery>) =>
    apiRequest<Paginated<Computer>>('/computers', {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        department: query.department,
        healthStatus: query.healthStatus,
        includeArchived: query.includeArchived,
        onlyDisposed: query.onlyDisposed,
        disposalType: query.disposalType,
      },
    }),

  findById: (id: number) => apiRequest<Computer>(`/computers/${id}`),

  /** A série de uso das últimas horas, da mais antiga para a mais nova. */
  samples: (id: number) => apiRequest<ComputerSample[]>(`/computers/${id}/samples`),

  /** Os episódios de alerta, do mais recente para o mais antigo. */
  alerts: (id: number) => apiRequest<ComputerAlert[]>(`/computers/${id}/alerts`),

  /**
   * Cadastra a máquina e recebe o token do agente.
   *
   * A resposta traz o token em texto puro, e é a ÚNICA vez que ele existe legível — quem
   * chama precisa mostrá-lo na hora, porque não há como pedi-lo de novo.
   */
  create: (body: CreateComputerInput) =>
    apiRequest<CreatedComputer>('/computers', { method: 'POST', body }),

  update: (id: number, body: UpdateComputerInput) =>
    apiRequest<Computer>(`/computers/${id}`, { method: 'PATCH', body }),

  /** Descarta a máquina: ela sai das listas, com tipo, motivo e a data de hoje. */
  dispose: (id: number, body: DisposeComputerInput) =>
    apiRequest<Computer>(`/computers/${id}/disposal`, { method: 'POST', body }),

  /** Devolve a máquina descartada ao inventário, limpando o descarte inteiro. */
  restore: (id: number) =>
    apiRequest<Computer>(`/computers/${id}/disposal`, { method: 'DELETE' }),

  /** Gera um token novo e invalida o anterior — token perdido ou token vazado. */
  regenerateToken: (id: number) =>
    apiRequest<CreatedComputer>(`/computers/${id}/token`, { method: 'POST' }),
};
