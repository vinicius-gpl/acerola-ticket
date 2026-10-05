import { createForm } from '@tanstack/svelte-form';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { inventoryUnitLabel } from '@template/shared/domain/inventory-catalog.util';
import {
  type DisposalReason,
  type StockMovementType,
} from '@template/shared/domain/inventory-stock.util';
import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';
import {
  type InventoryMovementFormValues,
  inventoryMovementFormSchema,
} from '@template/shared/schemas/inventory-movement.schema';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { inventoryItemsApi } from '$lib/api/inventory-items.api';
import {
  type InventoryMovementFormField,
  type InventoryProductOption,
} from '$lib/components/acerola-inventory-movement-dialog/acerola-inventory-movement-dialog.svelte';
import { toFieldState } from '$lib/hooks/use-form-projection/use-form-projection.svelte';
import { INVENTORY_QUERY_KEY } from '$lib/hooks/use-inventory-list/use-inventory-list.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

export type InventoryMovementFormModel = {
  data: {
    type: StockMovementType;
    product: { name: string; balance: number; unitLabel: string } | null;
    productOptions: InventoryProductOption[];
    fields: Record<InventoryMovementFormField, FormFieldState>;
  };
  state: { isSubmitting: boolean; isProductsLoading: boolean; error: string | null };
  actions: {
    onChange: (field: InventoryMovementFormField, value: string) => void;
    onBlur: (field: InventoryMovementFormField) => void;
    onSubmit: () => void;
  };
};

/** O painel da Manutenção soma o que o depósito move: ele recarrega junto. */
export const MAINTENANCE_DASHBOARD_QUERY_KEY = ['maintenance-dashboard'] as const;

/** O produto como o diálogo mostra: nome, quanto há e em que medida. */
function productOf(item: InventoryItem | undefined): InventoryMovementFormModel['data']['product'] {
  if (!item) return null;

  return { name: item.name, balance: item.balance, unitLabel: inventoryUnitLabel(item.unit) };
}

/**
 * O formulário de ENTRADA, SAÍDA ou DESCARTE de um produto do depósito da Manutenção.
 *
 * O tipo chega de fora e não muda: quem abriu o diálogo pelo botão "Saída" já disse o que
 * queria. O produto pode chegar escolhido (`item`, vindo do cartão do Depósito) ou ser
 * escolhido aqui (a tela de Descarte) — só neste segundo caso a lista de produtos é buscada.
 *
 * As MESMAS regras do servidor valem aqui (o schema do `shared`), e a recusa que só o
 * servidor sabe dar — "só há 2 no depósito" — chega por `state.error`, com o diálogo aberto.
 */
export function useInventoryMovementFormModel({
  type,
  item,
  onSaved,
}: {
  type: StockMovementType;
  item: InventoryItem | null;
  onSaved: () => void;
}): InventoryMovementFormModel {
  const queryClient = useQueryClient();

  /* Só busca os produtos quando é a pessoa quem escolhe: com o produto já na mão, a lista
     seria uma ida ao servidor para mostrar nada. */
  const products = mirrorStore(
    createQuery(
      writable({
        queryKey: [...INVENTORY_QUERY_KEY, 'options'],
        queryFn: () => inventoryItemsApi.list({ page: 1, pageSize: MAX_PAGE_SIZE }),
        enabled: item === null,
      }),
    ),
  );

  const save = mirrorStore(
    createMutation({
      mutationFn: (values: InventoryMovementFormValues) =>
        inventoryItemsApi.createMovement(Number(values.itemId), {
          type: values.type,
          quantity: Number(values.quantity),
          reason: values.type === 'disposal' ? (values.reason as DisposalReason) : null,
          note: values.note,
        }),
      onSuccess: async () => {
        /* O saldo mora no produto e o extrato na mesma chave: uma invalidação recarrega o
           Depósito, o Descarte e o Inventário de uma vez. */
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: MAINTENANCE_DASHBOARD_QUERY_KEY }),
        ]);
        onSaved();
      },
    }),
  );

  const form = createForm(() => ({
    defaultValues: {
      itemId: item ? String(item.id) : '',
      type,
      quantity: '',
      reason: '',
      note: '',
    } as InventoryMovementFormValues,
    /* Um validador só, em `onChange`: com o schema também em `onSubmit`, o erro de um envio
       vazio fica PRESO no campo mesmo depois de corrigido — ver `use-task-form`. */
    validators: { onChange: inventoryMovementFormSchema },
    /* `mutate`, e não `await mutateAsync`: a recusa do servidor já chega por `save.error`. */
    onSubmit: ({ value }: { value: InventoryMovementFormValues }) => {
      save.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  /** O produto do movimento: o que veio escolhido, ou o que a pessoa escolheu na lista. */
  const chosenItem = (): InventoryItem | undefined => {
    if (item) return item;

    return products.current.data?.items.find(
      (option) => String(option.id) === values.current.itemId,
    );
  };

  return {
    /* `get` em vez de valor: o model é montado uma vez e a tela lê dele a cada tecla. */
    get data() {
      const field = (name: InventoryMovementFormField): FormFieldState =>
        toFieldState(values.current[name], fieldMeta.current[name], isSubmitted.current);

      return {
        type,
        product: productOf(chosenItem()),
        productOptions: item
          ? []
          : (products.current.data?.items ?? []).map((option) => ({
              value: String(option.id),
              label: option.name,
            })),
        fields: {
          itemId: field('itemId'),
          quantity: field('quantity'),
          reason: field('reason'),
          note: field('note'),
        },
      };
    },
    get state() {
      return {
        isSubmitting: save.current.isPending,
        isProductsLoading: item === null && products.current.isPending,
        error: readError(save.current.error) ?? readError(products.current.error),
      };
    },
    actions: {
      onChange: (field, value) => form.setFieldValue(field, value as never),
      /* `validateField` só marca "tocado" quando existe um `form.Field` montado — este hook
         chama `setFieldValue`/`validateField` direto, sem montar um. */
      onBlur: (field) => {
        form.setFieldMeta(field, (prev) => ({ ...prev, isTouched: true }));
        void form.validateField(field, 'change');
      },
      onSubmit: () => void form.handleSubmit(),
    },
  };
}
