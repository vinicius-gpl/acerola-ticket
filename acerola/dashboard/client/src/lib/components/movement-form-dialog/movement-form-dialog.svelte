<script lang="ts" module>
  import {
    movementTypeLabel,
    partConditionLabel,
    type MovementType,
  } from '@template/shared/domain/part-catalog.util';
  import { NOTE_MAX_LENGTH, type Part } from '@template/shared/schemas/part.schema';

  import { type FormFieldState } from '$lib/types/form-field.type';

  export type MovementFormField = 'quantity' | 'computerId' | 'handledBy' | 'note';

  export type MachineOption = { value: string; label: string };

  /**
   * ENTRADA ou SAÍDA de uma peça, num modal.
   *
   * O tipo NÃO é um campo: ele vem do botão que abriu o diálogo e aparece no título. Quem
   * clicou em "Saída" já disse o que queria, e um seletor aqui dentro só criaria a chance de
   * registrar o contrário.
   *
   * O saldo atual fica visível o tempo todo: é o número que decide se a saída cabe, e
   * obrigar a pessoa a fechar o modal para conferi-lo é como ela erra a quantidade.
   */
  export type MovementFormDialogProps = {
    data: {
      part: Part;
      type: MovementType;
      fields: Record<MovementFormField, FormFieldState>;
      machines: MachineOption[];
    };
    state: {
      isOpen: boolean;
      isSubmitting?: boolean;
      isMachinesLoading?: boolean;
      error?: string | null;
    };
    actions: {
      onChange: (field: MovementFormField, value: string) => void;
      onBlur: (field: MovementFormField) => void;
      onSubmit: () => void;
      onClose: () => void;
    };
  };

  /** A opção vazia: movimentação que não tem máquina — compra, devolução ao depósito. */
  export const NO_MACHINE_OPTION = { value: '', label: 'Nenhuma máquina' };
</script>

<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import SelectField from '$lib/components/select-field/select-field.svelte';
  import SubmitButton from '$lib/components/submit-button/submit-button.svelte';
  import TextAreaField from '$lib/components/text-area-field/text-area-field.svelte';
  import TextField from '$lib/components/text-field/text-field.svelte';

  let { data, state: dialogState, actions }: MovementFormDialogProps = $props();

  const fields = $derived(data.fields);
  const isOut = $derived(data.type === 'out');
  const machineOptions = $derived([NO_MACHINE_OPTION, ...data.machines]);

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
    <form novalidate class="flex flex-col gap-4" onsubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{movementTypeLabel(data.type)} de peça</DialogTitle>
        <DialogDescription>
          {data.part.name} · {partConditionLabel(data.part.condition)} · hoje há
          <strong>{data.part.balance}</strong>
          na prateleira
        </DialogDescription>
      </DialogHeader>

      <TextField
        data={{
          label: 'Quantidade',
          name: 'quantity',
          value: fields.quantity.value,
          placeholder: '1',
        }}
        state={{
          error: fields.quantity.error,
          isDisabled: dialogState.isSubmitting,
          isAutoFocused: true,
        }}
        actions={{
          onChange: (value: string) => actions.onChange('quantity', value),
          onBlur: () => actions.onBlur('quantity'),
        }}
      />

      <div class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">
          {isOut ? 'Para qual máquina' : 'De qual máquina'}
        </span>
        <SelectField
          data={{ value: fields.computerId.value, options: machineOptions }}
          ui={{ ariaLabel: isOut ? 'Para qual máquina' : 'De qual máquina' }}
          state={{ isDisabled: dialogState.isSubmitting || dialogState.isMachinesLoading }}
          actions={{ onChange: (value: string) => actions.onChange('computerId', value) }}
        />
        <span class="text-ink-500 text-xs">
          {#if dialogState.isMachinesLoading}
            Carregando as máquinas do inventário…
          {:else}
            Opcional. Ligando à máquina, a peça aparece na ficha dela.
          {/if}
        </span>
      </div>

      <TextField
        data={{
          label: isOut ? 'Quem retirou' : 'Quem repôs',
          name: 'handledBy',
          value: fields.handledBy.value,
          placeholder: 'Nome de quem mexeu na prateleira',
        }}
        state={{ error: fields.handledBy.error, isDisabled: dialogState.isSubmitting }}
        actions={{
          onChange: (value: string) => actions.onChange('handledBy', value),
          onBlur: () => actions.onBlur('handledBy'),
        }}
      />

      <TextAreaField
        data={{
          label: 'Observação',
          name: 'note',
          value: fields.note.value,
          placeholder: 'Ex: entregue para Fulano, sala 3',
          maxLength: NOTE_MAX_LENGTH,
        }}
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
          data={{
            label: isOut ? 'Registrar saída' : 'Registrar entrada',
            loadingLabel: 'Salvando…',
          }}
          ui={{ className: 'sm:w-auto' }}
          state={{ isLoading: dialogState.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
