import {
  type CreateTransferInput,
  type InstalledPart,
  type Transfer,
} from '@template/shared/schemas/transfer.schema';

import { apiRequest } from './http-client';

/**
 * As chamadas da transferência. Todas penduradas na máquina: transferência não existe
 * sozinha, ela é sempre a mudança DE UMA máquina.
 */
export const transfersApi = {
  list: (computerId: number) => apiRequest<Transfer[]>(`/computers/${computerId}/transfers`),

  installedParts: (computerId: number) =>
    apiRequest<InstalledPart[]>(`/computers/${computerId}/transfers/installed-parts`),

  create: (computerId: number, input: CreateTransferInput) =>
    apiRequest<Transfer>(`/computers/${computerId}/transfers`, { method: 'POST', body: input }),
};
