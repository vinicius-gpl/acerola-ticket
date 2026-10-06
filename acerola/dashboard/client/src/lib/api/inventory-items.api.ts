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

import { apiRequest } from './http-client';

/**
 * Chamadas da API do inventário da Manutenção. Nada aqui decide nada — é a tradução de uma
 * intenção em uma requisição, para que os view-models não montem URL à mão.
 *
 * O cadastro e a alteração vão como `FormData` porque a FOTO viaja junto: um envio só
 * significa que ou existe o produto COM a imagem, ou não existe produto nenhum. Com dois
 * envios, uma falha no meio deixaria o produto apontando para uma imagem que nunca subiu.
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

  create: (values: InventoryItemFormValues, photo: File | null) =>
    apiRequest<InventoryItem>('/inventory-items', {
      method: 'POST',
      body: toInventoryFormData(values, photo),
    }),

  /**
   * `removePhoto` é o que separa "não mexi na foto" de "quero sem foto": sem ele, salvar o
   * cadastro sem escolher imagem nenhuma apagaria a que já estava lá.
   */
  update: (id: number, values: InventoryItemFormValues, photo: File | null, removePhoto = false) =>
    apiRequest<InventoryItem>(`/inventory-items/${id}`, {
      method: 'PATCH',
      body: toInventoryFormData(values, photo, removePhoto),
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

/** Os campos do formulário e a foto num envio só. */
function toInventoryFormData(
  values: InventoryItemFormValues,
  photo: File | null,
  removePhoto = false,
): FormData {
  const form = new FormData();

  form.set('name', values.name);
  form.set('category', values.category);
  form.set('unit', values.unit);
  form.set('location', values.location);
  form.set('code', values.code);
  form.set('note', values.note);

  if (photo) form.set('photo', photo);
  /* Só quando for para tirar: o campo ausente é o caso normal, e mandar "false" sempre
     obrigaria o contrato a distinguir dois jeitos de dizer a mesma coisa. */
  if (removePhoto) form.set('removePhoto', 'true');

  return form;
}
