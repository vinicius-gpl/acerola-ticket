import { createForm } from '@tanstack/svelte-form';
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { refuseInventoryPhoto } from '@template/shared/domain/inventory-photo.util';
import {
  type InventoryItem,
  type InventoryItemFormValues,
  inventoryItemFormSchema,
} from '@template/shared/schemas/inventory-item.schema';

import { readError } from '$lib/api/http-client';
import { inventoryItemsApi } from '$lib/api/inventory-items.api';
import { type InventoryFormField } from '$lib/components/acerola-inventory-form-dialog/acerola-inventory-form-dialog.svelte';
import { toFieldState } from '$lib/hooks/use-form-projection/use-form-projection.svelte';
import { INVENTORY_QUERY_KEY } from '$lib/hooks/use-inventory-list/use-inventory-list.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

export type InventoryFormModel = {
  data: {
    mode: 'create' | 'edit';
    fields: Record<InventoryFormField, FormFieldState>;
    photo: {
      /** O que a tela mostra agora: a foto escolhida, a que já existe, ou nada. */
      previewUrl: string | null;
      /** O nome do arquivo escolhido — some quando a foto é a que já estava gravada. */
      fileName: string | null;
    };
  };
  state: { isSubmitting: boolean; error: string | null; photoError: string | null };
  actions: {
    onChange: (field: InventoryFormField, value: string) => void;
    onBlur: (field: InventoryFormField) => void;
    onPhotoChange: (file: File | null) => void;
    onPhotoRemove: () => void;
    onSubmit: () => void;
  };
};

/**
 * O formulário de cadastrar produto e o de corrigir o cadastro dele.
 *
 * A FOTO não passa pelo TanStack Form: ela não é um campo de texto com validação de schema, é
 * um arquivo com regra própria (formato e tamanho, conferidos pelo mesmo domínio que o
 * servidor usa). Por isso ela vive num `$state` ao lado, com o erro dela separado — recusar a
 * imagem não pode apagar o que a pessoa já digitou nos outros campos.
 *
 * O formulário começa com os valores de `item` e NÃO acompanha mudanças dele depois de
 * aberto: quem troca de produto é o `{#key}` da rota, que monta este model de novo.
 */
export function useInventoryFormModel({
  item,
  onSaved,
}: {
  item: InventoryItem | null;
  onSaved: () => void;
}): InventoryFormModel {
  const queryClient = useQueryClient();

  let photoFile = $state<File | null>(null);
  let photoPreview = $state<string | null>(null);
  let photoError = $state<string | null>(null);
  /* A pessoa pediu para ficar SEM foto: é diferente de "não mexi na foto". */
  let photoRemoved = $state(false);

  const save = mirrorStore(
    createMutation({
      mutationFn: (values: InventoryItemFormValues) => {
        if (item) return inventoryItemsApi.update(item.id, values, photoFile, photoRemoved);

        return inventoryItemsApi.create(values, photoFile);
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
        onSaved();
      },
    }),
  );

  const form = createForm(() => ({
    defaultValues: toFormValues(item),
    /* As MESMAS regras que o servidor usa. Um validador só, em `onChange`: com o schema
       também em `onSubmit`, o erro de um envio vazio fica PRESO no campo mesmo depois de
       corrigido — ver o comentário em `use-task-form`. */
    validators: { onChange: inventoryItemFormSchema },
    /* `mutate`, e não `await mutateAsync`: a recusa do servidor já chega à tela por
       `save.error`. Relançá-la daqui viraria uma rejeição sem dono no `handleSubmit`. */
    onSubmit: ({ value }: { value: InventoryItemFormValues }) => {
      save.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  return {
    /* `get` em vez de valor: o model é montado uma vez e a tela lê dele a cada tecla. */
    get data() {
      const field = (name: InventoryFormField): FormFieldState =>
        toFieldState(values.current[name], fieldMeta.current[name], isSubmitted.current);

      return {
        mode: item ? ('edit' as const) : ('create' as const),
        fields: {
          name: field('name'),
          category: field('category'),
          unit: field('unit'),
          location: field('location'),
          code: field('code'),
          note: field('note'),
        },
        photo: {
          previewUrl: photoPreview ?? (photoRemoved ? null : (item?.photoUrl ?? null)),
          fileName: photoFile?.name ?? null,
        },
      };
    },
    get state() {
      return {
        isSubmitting: save.current.isPending,
        error: readError(save.current.error),
        photoError,
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
      /**
       * A imagem escolhida passa pela MESMA régua do servidor antes de qualquer coisa: a
       * pessoa descobre que o arquivo não serve na hora, e não depois de esperar o envio.
       */
      onPhotoChange: (file) => {
        releasePreview();

        if (!file) {
          photoFile = null;
          photoPreview = null;
          photoError = null;
          return;
        }

        const refusal = refuseInventoryPhoto({ contentType: file.type, sizeBytes: file.size });
        if (refusal) {
          photoFile = null;
          photoPreview = null;
          photoError = refusal.message;
          return;
        }

        photoFile = file;
        photoPreview = URL.createObjectURL(file);
        photoError = null;
        photoRemoved = false;
      },
      onPhotoRemove: () => {
        releasePreview();
        photoFile = null;
        photoPreview = null;
        photoError = null;
        photoRemoved = true;
      },
      onSubmit: () => void form.handleSubmit(),
    },
  };

  /** O endereço temporário da prévia ocupa memória até ser devolvido ao navegador. */
  function releasePreview() {
    if (!photoPreview) return;

    URL.revokeObjectURL(photoPreview);
    photoPreview = null;
  }
}

/**
 * Os valores iniciais do formulário.
 *
 * Early return no cadastro (CONTRIBUTING §2), e não um `??` por campo: com seis campos, a
 * mesma função respondia a duas perguntas ao mesmo tempo ("tem produto?" e "este campo está
 * vazio?") e passava do teto de complexidade sem ter nenhuma decisão de verdade dentro.
 */
function toFormValues(item: InventoryItem | null): InventoryItemFormValues {
  if (!item) {
    return { name: '', category: 'other', unit: 'unit', location: '', code: '', note: '' };
  }

  return {
    name: item.name,
    category: item.category,
    unit: item.unit,
    location: item.location ?? '',
    code: item.code ?? '',
    note: item.note ?? '',
  };
}
