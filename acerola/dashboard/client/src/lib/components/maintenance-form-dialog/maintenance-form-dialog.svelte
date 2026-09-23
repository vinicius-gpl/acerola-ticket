<script lang="ts" module>
  import {
    MAINTENANCE_TYPES,
    MAINTENANCE_TYPE_LABELS,
  } from '@template/shared/domain/maintenance.util';
  import { DESCRIPTION_MAX_LENGTH } from '@template/shared/schemas/maintenance.schema';

  import { type FormFieldState } from '$lib/types/form-field.type';

  export type MaintenanceFormField =
    | 'computerId'
    | 'otherMachine'
    | 'type'
    | 'description'
    | 'performedBy'
    | 'performedAt';

  export type MachineOption = { value: string; label: string };

  /**
   * O formulário de registrar (e corrigir) uma manutenção, num modal.
   *
   * Função pura de props: o valor e o erro de cada campo chegam prontos (`FormFieldState`), e
   * a lista de máquinas vem de fora. Por isso o modal abre no Storybook preenchido, com erro
   * ou enviando — sem servidor e sem biblioteca de formulário no meio.
   *
   * **O campo de equipamento à mão só aparece quando nenhuma máquina foi escolhida.** Os dois
   * juntos deixariam o registro dizendo duas coisas diferentes sobre o mesmo serviço.
   */
  export type MaintenanceFormDialogProps = {
    data: {
      mode: 'create' | 'edit';
      fields: Record<MaintenanceFormField, FormFieldState>;
      machines: MachineOption[];
    };
    state: {
      isOpen: boolean;
      isSubmitting?: boolean;
      isMachinesLoading?: boolean;
      error?: string | null;
    };
    actions: {
      onChange: (field: MaintenanceFormField, value: string) => void;
      onBlur: (field: MaintenanceFormField) => void;
      onSubmit: () => void;
      onClose: () => void;
    };
  };

  const TYPE_OPTIONS = MAINTENANCE_TYPES.map((type) => ({
    value: type,
    label: MAINTENANCE_TYPE_LABELS[type],
  }));

  /** A opção que libera o campo de texto: equipamento que não está no inventário. */
  export const OTHER_MACHINE_OPTION = {
    value: '',
    label: 'Outro equipamento (fora do inventário)',
  };
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

  let { data, state: dialogState, actions }: MaintenanceFormDialogProps = $props();

  const isEdit = $derived(data.mode === 'edit');
  const fields = $derived(data.fields);

  const machineOptions = $derived([OTHER_MACHINE_OPTION, ...data.machines]);
  const isOtherMachine = $derived(fields.computerId.value === '');

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
        <DialogTitle>{isEdit ? 'Corrigir manutenção' : 'Registrar manutenção'}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'Altere o que ficou errado e salve.'
            : 'O que foi feito, em qual equipamento e quando.'}
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Equipamento</span>
        <SelectField
          data={{ value: fields.computerId.value, options: machineOptions }}
          ui={{ ariaLabel: 'Equipamento' }}
          state={{ isDisabled: dialogState.isSubmitting || dialogState.isMachinesLoading }}
          actions={{ onChange: (value: string) => actions.onChange('computerId', value) }}
        />
        {#if dialogState.isMachinesLoading}
          <span class="text-ink-500 text-xs">Carregando as máquinas do inventário…</span>
        {/if}
      </div>

      <!-- Só quando nenhuma máquina foi escolhida: é a saída para o que não está no inventário. -->
      {#if isOtherMachine}
        <TextField
          data={{
            label: 'Qual equipamento',
            name: 'otherMachine',
            value: fields.otherMachine.value,
            placeholder: 'Ex: impressora da recepção, notebook antigo',
          }}
          state={{ error: fields.otherMachine.error, isDisabled: dialogState.isSubmitting }}
          actions={{
            onChange: (value: string) => actions.onChange('otherMachine', value),
            onBlur: () => actions.onBlur('otherMachine'),
          }}
        />
      {/if}

      <div class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Tipo</span>
        <SelectField
          data={{ value: fields.type.value, options: TYPE_OPTIONS }}
          ui={{ ariaLabel: 'Tipo de manutenção' }}
          state={{ isDisabled: dialogState.isSubmitting }}
          actions={{ onChange: (value: string) => actions.onChange('type', value) }}
        />
      </div>

      <TextAreaField
        data={{
          label: 'O que foi feito',
          name: 'description',
          value: fields.description.value,
          placeholder: 'Ex: troca de SSD, limpeza interna, troca de memória',
          maxLength: DESCRIPTION_MAX_LENGTH,
        }}
        state={{ error: fields.description.error, isDisabled: dialogState.isSubmitting }}
        actions={{
          onChange: (value: string) => actions.onChange('description', value),
          onBlur: () => actions.onBlur('description'),
        }}
      />

      <TextField
        data={{
          label: 'Quem fez',
          name: 'performedBy',
          value: fields.performedBy.value,
          placeholder: 'Nome de quem fez o serviço',
        }}
        state={{ error: fields.performedBy.error, isDisabled: dialogState.isSubmitting }}
        actions={{
          onChange: (value: string) => actions.onChange('performedBy', value),
          onBlur: () => actions.onBlur('performedBy'),
        }}
      />

      <!-- A data do SERVIÇO, não a de hoje: lançar na segunda o que foi feito no sábado é o
           caso comum, não a exceção. -->
      <TextField
        data={{ label: 'Data do serviço', name: 'performedAt', value: fields.performedAt.value }}
        ui={{ type: 'date' }}
        state={{ error: fields.performedAt.error, isDisabled: dialogState.isSubmitting }}
        actions={{
          onChange: (value: string) => actions.onChange('performedAt', value),
          onBlur: () => actions.onBlur('performedAt'),
        }}
      />

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
            label: isEdit ? 'Salvar' : 'Registrar manutenção',
            loadingLabel: 'Salvando…',
          }}
          ui={{ className: 'sm:w-auto' }}
          state={{ isLoading: dialogState.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
