<script lang="ts">
  import {
    SCHEDULE_EVENT_CATEGORIES,
    SCHEDULE_EVENT_CATEGORY_LABELS,
  } from '@template/shared/domain/software-project.util';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
  import CalendarDays from '@lucide/svelte/icons/calendar-days';
  import Check from '@lucide/svelte/icons/check';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/acerola-dialog/acerola-dialog';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import SelectField from '$lib/components/acerola-select-field/acerola-select-field.svelte';
  import SubmitButton from '$lib/components/acerola-submit-button/acerola-submit-button.svelte';
  import TextField from '$lib/components/acerola-text-field/acerola-text-field.svelte';
  import { type SoftwareScheduleFormModel } from '$lib/hooks/use-software-schedule-form/use-software-schedule-form.svelte';

  let {
    open = $bindable(false),
    model,
    projects = [],
    onDelete,
    deleteError = null,
    isDeleting = false,
    onClose,
  }: {
    open: boolean;
    model: SoftwareScheduleFormModel;
    projects?: SoftwareProject[];
    onDelete?: () => void;
    deleteError?: string | null;
    isDeleting?: boolean;
    onClose: () => void;
  } = $props();

  const isEdit = $derived(model.data.mode === 'edit');

  const categoryOptions = SCHEDULE_EVENT_CATEGORIES.map((cat) => ({
    value: cat,
    label: SCHEDULE_EVENT_CATEGORY_LABELS[cat],
  }));

  const SWATCHES: {
    value: string;
    label: string;
    bgClass: string;
    ringClass: string;
  }[] = [
    { value: 'blue', label: 'Azul', bgClass: 'bg-info', ringClass: 'ring-info' },
    { value: 'green', label: 'Verde', bgClass: 'bg-success', ringClass: 'ring-success' },
    { value: 'amber', label: 'Âmbar', bgClass: 'bg-warning', ringClass: 'ring-warning' },
    { value: 'purple', label: 'Roxo', bgClass: 'bg-primary', ringClass: 'ring-primary' },
    { value: 'rose', label: 'Rosa', bgClass: 'bg-accent-hero', ringClass: 'ring-accent-hero' },
    { value: 'indigo', label: 'Índigo', bgClass: 'bg-primary', ringClass: 'ring-primary' },
    { value: 'red', label: 'Vermelho', bgClass: 'bg-destructive', ringClass: 'ring-destructive' },
    {
      value: 'neutral',
      label: 'Grafite',
      bgClass: 'bg-muted-foreground',
      ringClass: 'ring-muted-foreground',
    },
  ];

  const projectOptions = $derived([
    { value: '', label: 'Nenhum' },
    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
  ]);

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    model.actions.onSubmit();
  }
</script>

<Dialog {open} onOpenChange={(isOpen) => !isOpen && onClose()}>
  <DialogContent class="max-w-lg">
    <DialogHeader class="gap-1.5">
      <div class="flex items-center gap-2.5">
        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-chip bg-primary/10 text-primary"
        >
          <CalendarDays class="size-4" aria-hidden="true" />
        </span>
        <DialogTitle class="text-lg font-semibold tracking-tight">
          {isEdit ? 'Editar Compromisso' : 'Novo Compromisso'}
        </DialogTitle>
      </div>
      <DialogDescription class="text-xs text-muted-foreground">
        {isEdit
          ? 'Atualize as informações do agendamento técnico no cronograma.'
          : 'Agende um deploy, reunião, manutenção ou marco de desenvolvimento.'}
      </DialogDescription>
    </DialogHeader>

    {#if model.state.error}
      <ErrorState
        data={{ title: 'Não foi possível salvar o compromisso', message: model.state.error }}
        ui={{ variant: 'inline' }}
      />
    {/if}

    {#if deleteError}
      <p
        role="alert"
        class="rounded-box border border-destructive/40 bg-destructive-soft p-3 text-sm text-destructive"
      >
        {deleteError}
      </p>
    {/if}
    <form novalidate onsubmit={handleSubmit} class="flex flex-col gap-4">
      <TextField
        data={{
          label: 'Título do compromisso',
          name: 'title',
          value: model.data.fields.title.value,
          placeholder: 'Ex: Deploy Portal v2, Standup, Homologação',
          isRequired: true,
        }}
        state={{
          error: model.data.fields.title.error,
          isDisabled: model.state.isSubmitting,
        }}
        actions={{
          onChange: (val: string) => model.actions.onChange('title', val),
          onBlur: () => model.actions.onBlur('title'),
        }}
      />

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-medium text-foreground">Categoria</span>
          <SelectField
            data={{
              value: model.data.fields.category.value,
              options: categoryOptions,
            }}
            actions={{
              onChange: (val) => model.actions.onChange('category', val),
            }}
          />
        </div>

        {#if projects.length > 0}
          <div class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-foreground"> Sistema vinculado (opcional) </span>
            <SelectField
              data={{
                value: model.data.fields.projectId.value ?? '',
                options: projectOptions,
              }}
              actions={{
                onChange: (val) => model.actions.onChange('projectId', val),
              }}
            />
          </div>
        {/if}
      </div>

      <!-- Seletor Elegante de Cor em Swatches -->
      <div class="flex flex-col gap-2 rounded-box border border-border/80 bg-muted/20 p-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-foreground">Cor do bloco na agenda</span>
          <span class="text-xs font-medium text-muted-foreground">
            {SWATCHES.find((s) => s.value === model.data.fields.color.value)?.label ?? 'Azul'}
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          {#each SWATCHES as swatch (swatch.value)}
            {@const isSelected = model.data.fields.color.value === swatch.value}
            <button
              type="button"
              class="group relative flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110 focus:outline-none {isSelected
                ? 'ring-2 ring-offset-2 ring-offset-card ' + swatch.ringClass
                : ''}"
              onclick={() => model.actions.onChange('color', swatch.value)}
              title={swatch.label}
              aria-label={swatch.label}
            >
              <span class="size-5 rounded-full {swatch.bgClass}"></span>
              {#if isSelected}
                <Check class="absolute size-3 text-white drop-shadow-xs" />
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-[1.25fr_1fr_1fr]">
        <TextField
          data={{
            label: 'Data',
            name: 'date',
            value: model.data.fields.date.value,
            isRequired: true,
          }}
          ui={{ type: 'date', className: 'col-span-2 min-w-0 sm:col-span-1' }}
          state={{
            error: model.data.fields.date.error,
            isDisabled: model.state.isSubmitting,
          }}
          actions={{
            onChange: (val: string) => model.actions.onChange('date', val),
            onBlur: () => model.actions.onBlur('date'),
          }}
        />

        <TextField
          data={{
            label: 'Início',
            name: 'startTime',
            value: model.data.fields.startTime.value,
            placeholder: '09:00',
            isRequired: true,
          }}
          ui={{ type: 'time', className: 'min-w-0' }}
          state={{
            error: model.data.fields.startTime.error,
            isDisabled: model.state.isSubmitting,
          }}
          actions={{
            onChange: (val: string) => model.actions.onChange('startTime', val),
            onBlur: () => model.actions.onBlur('startTime'),
          }}
        />

        <TextField
          data={{
            label: 'Fim',
            name: 'endTime',
            value: model.data.fields.endTime.value,
            placeholder: '10:00',
            isRequired: true,
          }}
          ui={{ type: 'time', className: 'min-w-0' }}
          state={{
            error: model.data.fields.endTime.error,
            isDisabled: model.state.isSubmitting,
          }}
          actions={{
            onChange: (val: string) => model.actions.onChange('endTime', val),
            onBlur: () => model.actions.onBlur('endTime'),
          }}
        />
      </div>

      <TextField
        data={{
          label: 'Observações / Link',
          name: 'note',
          value: model.data.fields.note.value,
          placeholder: 'Anotações sobre a janela de manutenção, reunião ou link',
        }}
        state={{
          error: model.data.fields.note.error,
          isDisabled: model.state.isSubmitting,
        }}
        actions={{
          onChange: (val: string) => model.actions.onChange('note', val),
          onBlur: () => model.actions.onBlur('note'),
        }}
      />

      <DialogFooter class="mt-2 flex items-center justify-between border-t border-border/60 pt-3">
        <div>
          {#if isEdit && onDelete}
            <button
              type="button"
              class="inline-flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline"
              onclick={onDelete}
              disabled={isDeleting || model.state.isSubmitting}
            >
              <Trash2 class="size-3.5" />
              {isDeleting ? 'Excluindo…' : 'Excluir compromisso'}
            </button>
          {/if}
        </div>

        <div class="flex items-center gap-2">
          <ActionButton
            data={{ label: 'Cancelar' }}
            ui={{ variant: 'secondary' }}
            actions={{ onClick: onClose }}
          />
          <SubmitButton
            data={{ label: 'Salvar compromisso', loadingLabel: 'Salvando…' }}
            state={{ isLoading: model.state.isSubmitting }}
          />
        </div>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
