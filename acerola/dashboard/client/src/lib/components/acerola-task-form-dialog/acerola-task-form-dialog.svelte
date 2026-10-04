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
  export type AcerolaTaskFormDialogProps = {
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
  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import SubmitButton from '$lib/components/acerola-submit-button/acerola-submit-button.svelte';
  import TextAreaField from '$lib/components/acerola-text-area-field/acerola-text-area-field.svelte';
  import TextField from '$lib/components/acerola-text-field/acerola-text-field.svelte';
  import { cn } from '$lib/utils/cn';

  import CheckSquare from '@lucide/svelte/icons/check-square';
  import Clock from '@lucide/svelte/icons/clock';
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
  import CircleDashed from '@lucide/svelte/icons/circle-dashed';

  let { data, state, actions }: AcerolaTaskFormDialogProps = $props();

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
    <form novalidate class="flex flex-col gap-4.5" onsubmit={handleSubmit}>
      <DialogHeader class="gap-1.5">
        <div class="flex items-center gap-2.5">
          <span class="flex size-7 shrink-0 items-center justify-center rounded-chip bg-primary/10 text-primary">
            <CheckSquare class="size-4" aria-hidden="true" />
          </span>
          <DialogTitle class="text-lg font-semibold tracking-tight">{isEdit ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
        </div>
        <DialogDescription class="text-xs text-muted-foreground">
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

      <!-- Segmented Status Selector em vez de Select dropdown puro -->
      <div class="flex flex-col gap-2">
        <span class="text-ink-700 text-sm font-medium">Situação da tarefa</span>
        <div class="grid grid-cols-3 gap-2 p-1 rounded-box bg-ink-100 border border-border/60">
          {#each STATUS_OPTIONS as opt (opt.value)}
            {@const isSelected = fields.status.value === opt.value}
            <button
              type="button"
              disabled={state.isSubmitting}
              class={cn(
                "control-sm flex items-center justify-center gap-1.5 rounded-chip text-xs font-semibold transition-all cursor-pointer",
                isSelected
                  ? "bg-card text-foreground shadow-xs font-semibold border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-ink-100/50"
              )}
              onclick={() => actions.onChange('status', opt.value)}
            >
              {#if opt.value === 'todo'}
                <CircleDashed class="size-3.5 text-ink-500" />
              {:else if opt.value === 'doing'}
                <Clock class="size-3.5 text-warning" />
              {:else}
                <CheckCircle2 class="size-3.5 text-success" />
              {/if}
              <span class="truncate">{opt.label}</span>
            </button>
          {/each}
        </div>
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
