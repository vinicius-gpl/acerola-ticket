<script lang="ts" module>
  import {
    TASK_STATUS_LABELS,
    TASK_STATUSES,
    type TaskStatus,
  } from '@template/shared/domain/task-status.util';
  import { type FormFieldState } from '$lib/types/form-field.type';

  export type TaskFormField = 'title' | 'description' | 'status';

  /**
   * O formulário de criar/editar tarefa, num modal.
   *
   * Função pura de props: o valor e o erro de cada campo chegam prontos (`FormFieldState`), e
   * por isso o modal abre no Storybook preenchido, com erro ou enviando — sem servidor e sem
   * biblioteca de formulário no meio.
   *
   * A recusa do servidor aparece DENTRO do modal, e ele continua aberto: fechar jogaria fora o
   * que foi digitado, e a pessoa teria que preencher tudo de novo para ler o mesmo erro.
   */
  export type TaskFormDialogProps = {
    data: {
      mode: 'create' | 'edit';
      fields: Record<TaskFormField, FormFieldState>;
    };
    state: { isOpen: boolean; isSubmitting?: boolean; error?: string | null };
    actions: {
      onChange: (field: TaskFormField, value: string) => void;
      onBlur: (field: TaskFormField) => void;
      onSubmit: () => void;
      onClose: () => void;
    };
  };

  const STATUS_OPTIONS = TASK_STATUSES.map((status: TaskStatus) => ({
    value: status,
    label: TASK_STATUS_LABELS[status],
  }));
</script>

<script lang="ts">
  import { DESCRIPTION_MAX_LENGTH } from '@template/shared/schemas/task.schema';

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

  let { data, state, actions }: TaskFormDialogProps = $props();

  const isEdit = $derived(data.mode === 'edit');
  const fields = $derived(data.fields);

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<Dialog
  open={state.isOpen}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent>
    <form novalidate class="flex flex-col gap-4" onsubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
        <DialogDescription>
          {isEdit ? 'Altere o que precisar e salve.' : 'Só o título é obrigatório.'}
        </DialogDescription>
      </DialogHeader>

      <TextField
        data={{
          label: 'Título',
          name: 'title',
          value: fields.title.value,
          placeholder: 'O que precisa ser feito?',
        }}
        state={{
          error: fields.title.error,
          isDisabled: state.isSubmitting,
          isAutoFocused: true,
        }}
        actions={{
          onChange: (value: string) => actions.onChange('title', value),
          onBlur: () => actions.onBlur('title'),
        }}
      />

      <TextAreaField
        data={{
          label: 'Descrição',
          name: 'description',
          value: fields.description.value,
          placeholder: 'Detalhes, se houver',
          maxLength: DESCRIPTION_MAX_LENGTH,
        }}
        state={{ error: fields.description.error, isDisabled: state.isSubmitting }}
        actions={{
          onChange: (value: string) => actions.onChange('description', value),
          onBlur: () => actions.onBlur('description'),
        }}
      />

      <div class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Situação</span>
        <SelectField
          data={{ value: fields.status.value, options: STATUS_OPTIONS }}
          ui={{ ariaLabel: 'Situação' }}
          state={{ isDisabled: state.isSubmitting }}
          actions={{ onChange: (value: string) => actions.onChange('status', value) }}
        />
      </div>

      {#if state.error}
        <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
      {/if}

      <DialogFooter>
        <ActionButton
          data={{ label: 'Cancelar' }}
          ui={{ variant: 'secondary' }}
          state={{ isDisabled: state.isSubmitting }}
          actions={{ onClick: actions.onClose }}
        />
        <SubmitButton
          data={{ label: isEdit ? 'Salvar' : 'Criar tarefa', loadingLabel: 'Salvando…' }}
          ui={{ className: 'sm:w-auto' }}
          state={{ isLoading: state.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
