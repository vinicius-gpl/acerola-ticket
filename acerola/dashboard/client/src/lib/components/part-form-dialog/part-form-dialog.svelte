<script lang="ts" module>
  import {
    PART_CATEGORIES,
    PART_CATEGORY_LABELS,
    PART_CONDITIONS,
    PART_CONDITION_LABELS,
  } from '@template/shared/domain/part-catalog.util';

  import { type FormFieldState } from '$lib/types/form-field.type';

  export type PartFormField = 'name' | 'category' | 'condition' | 'initialQuantity';

  /**
   * O formulário de cadastrar peça e o de corrigir o cadastro dela, num modal.
   *
   * Função pura de props: o valor e o erro de cada campo chegam prontos (`FormFieldState`).
   * Por isso o modal abre no Storybook preenchido, com erro ou enviando — sem servidor e sem
   * biblioteca de formulário no meio.
   *
   * **A quantidade só aparece no cadastro.** Depois, o saldo só se move por entrada e saída:
   * um campo de quantidade na edição seria um jeito de reescrever o estoque sem deixar linha
   * no extrato.
   */
  export type PartFormDialogProps = {
    data: {
      mode: 'create' | 'edit';
      fields: Record<PartFormField, FormFieldState>;
    };
    state: { isOpen: boolean; isSubmitting?: boolean; error?: string | null };
    actions: {
      onChange: (field: PartFormField, value: string) => void;
      onBlur: (field: PartFormField) => void;
      onSubmit: () => void;
      onClose: () => void;
    };
  };

  const CATEGORY_OPTIONS = PART_CATEGORIES.map((category) => ({
    value: category,
    label: PART_CATEGORY_LABELS[category],
  }));

  const CONDITION_OPTIONS = PART_CONDITIONS.map((condition) => ({
    value: condition,
    label: PART_CONDITION_LABELS[condition],
  }));
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
  import TextField from '$lib/components/text-field/text-field.svelte';
  import Package from '@lucide/svelte/icons/package';

  let { data, state: dialogState, actions }: PartFormDialogProps = $props();

  const isEdit = $derived(data.mode === 'edit');
  const fields = $derived(data.fields);

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
          <span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package class="size-4" aria-hidden="true" />
          </span>
          <DialogTitle class="text-lg font-semibold tracking-tight">{isEdit ? 'Corrigir peça' : 'Cadastrar peça'}</DialogTitle>
        </div>
        <DialogDescription class="text-xs text-muted-foreground">
          {isEdit
            ? 'Descrição, categoria e condição. O saldo muda por entrada e saída.'
            : 'O que é a peça e quantas existem hoje na prateleira.'}
        </DialogDescription>
      </DialogHeader>

      <TextField
        data={{
          label: 'O que é a peça',
          name: 'name',
          value: fields.name.value,
          placeholder: 'Ex: SSD 240 GB Kingston, Monitor 22 polegadas',
        }}
        state={{
          error: fields.name.error,
          isDisabled: dialogState.isSubmitting,
          isAutoFocused: true,
        }}
        actions={{
          onChange: (value: string) => actions.onChange('name', value),
          onBlur: () => actions.onBlur('name'),
        }}
      />

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Categoria</span>
          <SelectField
            data={{ value: fields.category.value, options: CATEGORY_OPTIONS }}
            ui={{ ariaLabel: 'Categoria' }}
            state={{ isDisabled: dialogState.isSubmitting }}
            actions={{ onChange: (value: string) => actions.onChange('category', value) }}
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Condição</span>
          <SelectField
            data={{ value: fields.condition.value, options: CONDITION_OPTIONS }}
            ui={{ ariaLabel: 'Condição' }}
            state={{ isDisabled: dialogState.isSubmitting }}
            actions={{ onChange: (value: string) => actions.onChange('condition', value) }}
          />
        </div>
      </div>

      {#if !isEdit}
        <div class="flex flex-col gap-1.5">
          <TextField
            data={{
              label: 'Quantas existem hoje',
              name: 'initialQuantity',
              value: fields.initialQuantity.value,
              placeholder: 'Deixe em branco se a prateleira está vazia',
            }}
            state={{ error: fields.initialQuantity.error, isDisabled: dialogState.isSubmitting }}
            actions={{
              onChange: (value: string) => actions.onChange('initialQuantity', value),
              onBlur: () => actions.onBlur('initialQuantity'),
            }}
          />
          <p class="text-muted-foreground text-xs">
            Isso entra como a primeira entrada no histórico da peça.
          </p>
        </div>
      {/if}

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
          data={{ label: isEdit ? 'Salvar' : 'Cadastrar peça', loadingLabel: 'Salvando…' }}
          ui={{ className: 'sm:w-auto' }}
          state={{ isLoading: dialogState.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
