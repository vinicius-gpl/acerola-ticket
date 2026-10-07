import { parseAmountToCents } from '@template/shared/domain/maintenance-quote.util';
import {
  type MaintenanceQuote,
  type MaintenanceQuoteFormValues,
  type MaintenanceQuoteListQuery,
} from '@template/shared/schemas/maintenance-quote.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';

import { apiRequest } from './http-client';

/**
 * Chamadas da API dos orçamentos da Manutenção. Nada aqui decide nada — é a tradução de uma
 * intenção em uma requisição, para que os view-models não montem URL à mão.
 *
 * Guardar e alterar vão como `FormData` porque o DOCUMENTO viaja junto: um envio só significa
 * que ou existe o orçamento COM o arquivo, ou não existe orçamento nenhum.
 */
export const maintenanceQuotesApi = {
  list: (query: Partial<MaintenanceQuoteListQuery>) =>
    apiRequest<Paginated<MaintenanceQuote>>('/maintenance-quotes', {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        status: query.status,
        kind: query.kind,
      },
    }),

  create: (values: MaintenanceQuoteFormValues, attachment: File | null) =>
    apiRequest<MaintenanceQuote>('/maintenance-quotes', {
      method: 'POST',
      body: toQuoteFormData(values, attachment),
    }),

  /**
   * `removeAttachment` é o que separa "não mexi no documento" de "quero sem documento": sem
   * ele, salvar sem escolher arquivo nenhum apagaria o que já estava lá.
   */
  update: (
    id: number,
    values: MaintenanceQuoteFormValues,
    attachment: File | null,
    removeAttachment = false,
  ) =>
    apiRequest<MaintenanceQuote>(`/maintenance-quotes/${id}`, {
      method: 'PATCH',
      body: toQuoteFormData(values, attachment, removeAttachment),
    }),

  remove: (id: number) => apiRequest<void>(`/maintenance-quotes/${id}`, { method: 'DELETE' }),
};

/**
 * Os campos do formulário e o documento num envio só.
 *
 * O valor sai daqui em CENTAVOS: a pessoa digita "1.250,00", e o contrato da API só conhece
 * o inteiro. O formulário já recusou o que não é valor, então o `?? 0` nunca decide nada.
 */
function toQuoteFormData(
  values: MaintenanceQuoteFormValues,
  attachment: File | null,
  removeAttachment = false,
): FormData {
  const form = new FormData();

  form.set('supplier', values.supplier);
  form.set('description', values.description);
  form.set('kind', values.kind);
  form.set('amountCents', String(parseAmountToCents(values.amount) ?? 0));
  form.set('quotedOn', values.quotedOn);
  form.set('status', values.status);
  form.set('note', values.note);

  if (attachment) form.set('attachment', attachment);
  if (removeAttachment) form.set('removeAttachment', 'true');

  return form;
}
