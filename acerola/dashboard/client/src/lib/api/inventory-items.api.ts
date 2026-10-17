import {
  type InventoryItem,
  type InventoryItemFormValues,
  type InventoryItemListQuery,
} from '@template/shared/schemas/inventory-item.schema';
import {
  type CreateInventoryMovementInput,
  type InventoryMovement,
  type InventoryMovementListQuery,
} from '@template/shared/schemas/inventory-movement.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';
import { type StagedFile } from '@template/shared/schemas/staged-file.schema';

import { apiRequest, uploadFile } from './http-client';

/**
 * Chamadas da API do inventário da Manutenção. Nada aqui decide nada — é a tradução de uma
 * intenção em uma requisição, para que os view-models não montem URL à mão.
 *
 * A FOTO vai primeiro, direto para o storage (link assinado); o cadastro é gravado depois,
 * levando a chave dela. Se o envio falhar, nada é gravado: nunca existe produto apontando para
 * uma imagem que não subiu.
 */
export const inventoryItemsApi = {
  list: (query: Partial<InventoryItemListQuery>) =>
    apiRequest<Paginated<InventoryItem>>('/inventory-items', {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        category: query.category,
      },
    }),

  findById: (id: number) => apiRequest<InventoryItem>(`/inventory-items/${id}`),

  create: async (values: InventoryItemFormValues, photo: File | null) =>
    apiRequest<InventoryItem>('/inventory-items', {
      method: 'POST',
      body: toInventoryBody(values, await uploadPhoto(photo)),
    }),

  /**
   * `removePhoto` é o que separa "não mexi na foto" de "quero sem foto": sem ele, salvar o
   * cadastro sem escolher imagem nenhuma apagaria a que já estava lá.
   */
  update: async (
    id: number,
    values: InventoryItemFormValues,
    photo: File | null,
    removePhoto = false,
  ) =>
    apiRequest<InventoryItem>(`/inventory-items/${id}`, {
      method: 'PATCH',
      body: toInventoryBody(values, await uploadPhoto(photo), removePhoto),
    }),

  remove: (id: number) => apiRequest<void>(`/inventory-items/${id}`, { method: 'DELETE' }),

  /** O extrato do depósito. `type: 'disposal'` é a tela de Descarte inteira. */
  movements: (query: Partial<InventoryMovementListQuery>) =>
    apiRequest<Paginated<InventoryMovement>>('/inventory-items/movements', {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        itemId: query.itemId,
        type: query.type,
      },
    }),

  /** Entrada, saída ou descarte de um produto. O saldo é movido pelo servidor, junto. */
  createMovement: (itemId: number, body: CreateInventoryMovementInput) =>
    apiRequest<InventoryMovement>(`/inventory-items/${itemId}/movements`, {
      method: 'POST',
      body,
    }),
};

function uploadPhoto(photo: File | null): Promise<StagedFile | undefined> {
  if (!photo) return Promise.resolve(undefined);

  return uploadFile('/inventory-items/photo/upload-url', photo);
}

/** Os campos do formulário e a chave da foto já enviada. */
function toInventoryBody(
  values: InventoryItemFormValues,
  photo: StagedFile | undefined,
  removePhoto = false,
): Record<string, unknown> {
  return {
    name: values.name,
    category: values.category,
    unit: values.unit,
    location: values.location,
    code: values.code,
    note: values.note,
    photo,
    /* Só quando for para tirar: o campo ausente é o caso normal. */
    removePhoto: removePhoto || undefined,
  };
}
