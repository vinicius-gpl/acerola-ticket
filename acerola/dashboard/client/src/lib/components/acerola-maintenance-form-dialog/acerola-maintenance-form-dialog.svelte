<script lang="ts" module>
  import {
    MAINTENANCE_TYPES,
    MAINTENANCE_TYPE_LABELS,
    maintenanceTypeTone,
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
  export type AcerolaMaintenanceFormDialogProps = {
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
    tone: maintenanceTypeTone(type),
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
  import DatePicker from '$lib/components/acerola-date-picker/acerola-date-picker.svelte';
  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import SubmitButton from '$lib/components/acerola-submit-button/acerola-submit-button.svelte';
  import TextAreaField from '$lib/components/acerola-text-area-field/acerola-text-area-field.svelte';
  import TextField from '$lib/components/acerola-text-field/acerola-text-field.svelte';
  import Wrench from '@lucide/svelte/icons/wrench';

  let { data, state: dialogState, actions }: AcerolaMaintenanceFormDialogProps = $props();

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
      <DialogHeader class="gap-1.5">
        <div class="flex items-center gap-2.5">
          <span class="flex size-7 shrink-0 items-center justify-center rounded-chip bg-primary/10 text-primary">
            <Wrench class="size-4" aria-hidden="true" />
          </span>
          <DialogTitle class="text-lg font-semibold tracking-tight">{isEdit ? 'Corrigir manutenção' : 'Registrar manutenção'}</DialogTitle>
        </div>
        <DialogDescription class="text-xs text-muted-foreground">
          {isEdit
            ? 'Altere o que ficou errado e salve.'
            : 'O que foi feito, em qual equipamento e quando.'}
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Equipamento</span>
        <OptionPicker
          data={{ value: fields.computerId.value, options: machineOptions }}
          ui={{ ariaLabel: 'Equipamento', fullWidth: true }}
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
        <OptionPicker
          data={{ value: fields.type.value, options: TYPE_OPTIONS }}
          ui={{ ariaLabel: 'Tipo de manutenção', fullWidth: true }}
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

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Data do serviço</span>
          <DatePicker
            name="performedAt"
            ariaLabel="Data do serviço"
            value={fields.performedAt.value}
            disabled={dialogState.isSubmitting}
            placeholder="Selecione a data"
            onValueChange={(val) => {
              actions.onChange('performedAt', val ?? '');
              actions.onBlur('performedAt');
            }}
          />
          {#if fields.performedAt.error}
            <span class="text-xs text-destructive">{fields.performedAt.error}</span>
          {/if}
        </div>
      </div>

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
