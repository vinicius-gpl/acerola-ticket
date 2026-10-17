import { parseAmountToCents } from '@template/shared/domain/maintenance-quote.util';
import {
  type MaintenanceQuote,
  type MaintenanceQuoteFormValues,
  type MaintenanceQuoteListQuery,
} from '@template/shared/schemas/maintenance-quote.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';
import { type StagedFile } from '@template/shared/schemas/staged-file.schema';

import { apiRequest, uploadFile } from './http-client';

/**
 * Chamadas da API dos orçamentos da Manutenção. Nada aqui decide nada — é a tradução de uma
 * intenção em uma requisição, para que os view-models não montem URL à mão.
 *
 * O DOCUMENTO vai primeiro, direto para o storage (link assinado); o orçamento é gravado
 * depois, levando a chave dele. Ou existe o orçamento COM o arquivo, ou não existe orçamento.
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

  create: async (values: MaintenanceQuoteFormValues, attachment: File | null) =>
    apiRequest<MaintenanceQuote>('/maintenance-quotes', {
      method: 'POST',
      body: toQuoteBody(values, await uploadDocument(attachment)),
    }),

  /**
   * `removeAttachment` é o que separa "não mexi no documento" de "quero sem documento": sem
   * ele, salvar sem escolher arquivo nenhum apagaria o que já estava lá.
   */
  update: async (
    id: number,
    values: MaintenanceQuoteFormValues,
    attachment: File | null,
    removeAttachment = false,
  ) =>
    apiRequest<MaintenanceQuote>(`/maintenance-quotes/${id}`, {
      method: 'PATCH',
      body: toQuoteBody(values, await uploadDocument(attachment), removeAttachment),
    }),

  remove: (id: number) => apiRequest<void>(`/maintenance-quotes/${id}`, { method: 'DELETE' }),
};

function uploadDocument(attachment: File | null): Promise<StagedFile | undefined> {
  if (!attachment) return Promise.resolve(undefined);

  return uploadFile('/maintenance-quotes/attachment/upload-url', attachment);
}

/**
 * Os campos do formulário e a chave do documento já enviado.
 *
 * O valor sai daqui em CENTAVOS: a pessoa digita "1.250,00", e o contrato da API só conhece
 * o inteiro. O formulário já recusou o que não é valor, então o `?? 0` nunca decide nada.
 */
function toQuoteBody(
  values: MaintenanceQuoteFormValues,
  attachment: StagedFile | undefined,
  removeAttachment = false,
): Record<string, unknown> {
  return {
    supplier: values.supplier,
    description: values.description,
    kind: values.kind,
    amountCents: parseAmountToCents(values.amount) ?? 0,
    quotedOn: values.quotedOn,
    status: values.status,
    note: values.note,
    attachment,
    /* Só quando for para tirar: o campo ausente é o caso normal. */
    removeAttachment: removeAttachment || undefined,
  };
}
