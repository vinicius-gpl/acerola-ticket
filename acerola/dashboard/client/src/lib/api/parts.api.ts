import { type Paginated } from '@template/shared/schemas/pagination.schema';
import {
  type CreateMovementInput,
  type CreatePartInput,
  type MovementListQuery,
  type Part,
  type PartListQuery,
  type PartMovement,
  type UpdateMovementInput,
  type UpdatePartInput,
} from '@template/shared/schemas/part.schema';

import { apiRequest } from './http-client';

/**
 * Chamadas da API do depósito. Nada aqui decide nada — é a tradução de uma intenção em uma
 * requisição, para que os view-models não montem URL à mão.
 *
 * Não existe `removePart`: peça que não se usa mais fica com saldo zero. Apagá-la levaria
 * junto a explicação do que saiu do depósito.
 */
export const partsApi = {
  list: (query: Partial<PartListQuery>) =>
    apiRequest<Paginated<Part>>('/parts', {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        category: query.category,
        condition: query.condition,
        inStockOnly: query.inStockOnly,
      },
    }),

  findById: (id: number) => apiRequest<Part>(`/parts/${id}`),

  create: (body: CreatePartInput) => apiRequest<Part>('/parts', { method: 'POST', body }),

  update: (id: number, body: UpdatePartInput) =>
    apiRequest<Part>(`/parts/${id}`, { method: 'PATCH', body }),

  /** O extrato: `partId` recorta o de uma peça, `computerId` o que uma máquina recebeu. */
  movements: (query: Partial<MovementListQuery>) =>
    apiRequest<Paginated<PartMovement>>('/parts/movements', {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        partId: query.partId,
        computerId: query.computerId,
        type: query.type,
      },
    }),

  /** Entrada ou saída. O saldo se ajusta junto, no servidor. */
  createMovement: (partId: number, body: CreateMovementInput) =>
    apiRequest<PartMovement>(`/parts/${partId}/movements`, { method: 'POST', body }),

  updateMovement: (movementId: number, body: UpdateMovementInput) =>
    apiRequest<PartMovement>(`/parts/movements/${movementId}`, { method: 'PATCH', body }),

  /** Exclui a linha e devolve o saldo. */
  removeMovement: (movementId: number) =>
    apiRequest<void>(`/parts/movements/${movementId}`, { method: 'DELETE' }),
};
