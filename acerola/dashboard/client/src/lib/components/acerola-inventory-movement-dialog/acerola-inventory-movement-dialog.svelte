<script lang="ts" module>
  import {
    disposalReasonOptions,
    type StockMovementType,
  } from '@template/shared/domain/inventory-stock.util';
  import { INVENTORY_MOVEMENT_NOTE_MAX_LENGTH } from '@template/shared/schemas/inventory-movement.schema';

  import { type FormFieldState } from '$lib/types/form-field.type';

  export type InventoryMovementFormField = 'itemId' | 'quantity' | 'reason' | 'note';

  export type InventoryProductOption = { value: string; label: string };

  /**
   * ENTRADA, SAÍDA ou DESCARTE de um produto do depósito da Manutenção, num modal.
   *
   * O tipo NÃO é um campo: ele vem do botão que abriu o diálogo e aparece no título. Quem
   * clicou em "Saída" já disse o que queria, e um seletor aqui dentro só criaria a chance de
   * registrar o contrário.
   *
   * O PRODUTO às vezes já vem escolhido (o Depósito abre o diálogo a partir do cartão dele) e
   * às vezes é a pessoa quem escolhe (o Descarte começa pela pergunta "o que foi?"). Com
   * produto escolhido, `product` vem preenchido e a lista de opções não aparece.
   *
   * O saldo atual fica visível o tempo todo: é o número que decide se a saída cabe.
   */
  export type AcerolaInventoryMovementDialogProps = {
    data: {
      type: StockMovementType;
      /** O produto do movimento — nulo enquanto a pessoa ainda não escolheu. */
      product: { name: string; balance: number; unitLabel: string } | null;
      /** As opções do seletor de produto. Vazia quando o produto já veio escolhido. */
      productOptions: InventoryProductOption[];
      fields: Record<InventoryMovementFormField, FormFieldState>;
    };
    state: {
      isOpen: boolean;
      isSubmitting?: boolean;
      isProductsLoading?: boolean;
      error?: string | null;
    };
    actions: {
      onChange: (field: InventoryMovementFormField, value: string) => void;
      onBlur: (field: InventoryMovementFormField) => void;
      onSubmit: () => void;
      onClose: () => void;
    };
  };

  const REASON_OPTIONS = disposalReasonOptions();

  const COPY: Record<StockMovementType, { title: string; submit: string }> = {
    in: { title: 'Entrada no depósito', submit: 'Registrar entrada' },
    out: { title: 'Saída do depósito', submit: 'Registrar saída' },
    disposal: { title: 'Registrar descarte', submit: 'Registrar descarte' },
  };

  const TONE: Record<StockMovementType, string> = {
    in: 'bg-success/10 text-success',
    out: 'bg-warning/10 text-warning',
    disposal: 'bg-destructive/10 text-destructive',
  };
</script>

<script lang="ts">
  import ArrowDownLeft from '@lucide/svelte/icons/arrow-down-left';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import SelectField from '$lib/components/acerola-select-field/acerola-select-field.svelte';
  import SubmitButton from '$lib/components/acerola-submit-button/acerola-submit-button.svelte';
  import TextAreaField from '$lib/components/acerola-text-area-field/acerola-text-area-field.svelte';
  import TextField from '$lib/components/acerola-text-field/acerola-text-field.svelte';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import { cn } from '$lib/utils/cn';

  let { data, state: dialogState, actions }: AcerolaInventoryMovementDialogProps = $props();

  const fields = $derived(data.fields);
  const copy = $derived(COPY[data.type]);
  const isDisposal = $derived(data.type === 'disposal');
  const hasProductPicker = $derived(data.productOptions.length > 0 || dialogState.isProductsLoading);

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<Dialog
  open={dialogState.isOpen}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent>
    <form novalidate class="flex flex-col gap-4.5" onsubmit={handleSubmit}>
      <DialogHeader class="gap-1.5">
        <div class="flex items-center gap-2.5">
          <span
            class={cn(
              'rounded-chip flex size-7 shrink-0 items-center justify-center',
              TONE[data.type],
            )}
          >
            {#if data.type === 'in'}
              <ArrowDownLeft class="size-4" aria-hidden="true" />
            {:else if data.type === 'out'}
              <ArrowUpRight class="size-4" aria-hidden="true" />
            {:else}
              <Trash2 class="size-4" aria-hidden="true" />
            {/if}
          </span>
          <DialogTitle class="text-lg font-semibold tracking-tight">{copy.title}</DialogTitle>
        </div>
        <DialogDescription class="text-muted-foreground text-xs">
          {#if data.product}
            {data.product.name} · hoje há
            <strong>{data.product.balance}</strong>
            ({data.product.unitLabel}) no depósito
          {:else}
            Escolha o produto para ver quanto há no depósito.
          {/if}
        </DialogDescription>
      </DialogHeader>

      {#if hasProductPicker}
        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Produto</span>
          <SelectField
            data={{ value: fields.itemId.value, options: data.productOptions }}
            ui={{
              ariaLabel: 'Produto',
              placeholder: dialogState.isProductsLoading
                ? 'Carregando os produtos…'
                : 'Escolha o produto',
            }}
            state={{ isDisabled: dialogState.isSubmitting || dialogState.isProductsLoading }}
            actions={{ onChange: (value: string) => actions.onChange('itemId', value) }}
          />
          {#if fields.itemId.error}
            <p class="text-destructive text-xs">{fields.itemId.error}</p>
          {/if}
        </div>
      {/if}

      <TextField
        data={{
          label: 'Quantidade',
          name: 'quantity',
          value: fields.quantity.value,
          placeholder: '1',
        }}
        ui={{ inputMode: 'numeric' }}
        state={{
          error: fields.quantity.error,
          isDisabled: dialogState.isSubmitting,
          isAutoFocused: !hasProductPicker,
        }}
        actions={{
          onChange: (value: string) => actions.onChange('quantity', value),
          onBlur: () => actions.onBlur('quantity'),
        }}
      />

      <!-- O motivo é o que separa "usamos" de "perdemos" — e só o descarte tem. -->
      {#if isDisposal}
        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Motivo</span>
          <OptionPicker
            data={{ value: fields.reason.value, options: REASON_OPTIONS }}
            ui={{ ariaLabel: 'Motivo do descarte', fullWidth: true }}
            state={{ isDisabled: dialogState.isSubmitting }}
            actions={{ onChange: (value: string) => actions.onChange('reason', value) }}
          />
          {#if fields.reason.error}
            <p class="text-destructive text-xs">{fields.reason.error}</p>
          {/if}
        </div>
      {/if}

      <TextAreaField
        data={{
          label: 'Observação',
          name: 'note',
          value: fields.note.value,
          placeholder: isDisposal
            ? 'O que aconteceu com o produto'
            : 'Ex: compra do mês, entregue na copa',
          maxLength: INVENTORY_MOVEMENT_NOTE_MAX_LENGTH,
        }}
        ui={{ rows: 3 }}
        state={{ error: fields.note.error, isDisabled: dialogState.isSubmitting }}
        actions={{
          onChange: (value: string) => actions.onChange('note', value),
          onBlur: () => actions.onBlur('note'),
        }}
      />

      <!-- A recusa do servidor ("só há 2 no depósito") aparece AQUI DENTRO, e o modal
           continua aberto com o que foi digitado. -->
      {#if dialogState.error}
        <ErrorState data={{ message: dialogState.error }} ui={{ variant: 'inline' }} />
      {/if}

      <DialogFooter>
        <ActionButton
          data={{ label: 'Cancelar' }}
          ui={{ variant: 'secondary' }}
          state={{ isDisabled: dialogState.isSubmitting }}
          actions={{ onClick: actions.onClose }}
        />
        <SubmitButton
          data={{ label: copy.submit, loadingLabel: 'Salvando…' }}
          ui={{ className: 'sm:w-auto' }}
          state={{ isLoading: dialogState.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
