<script lang="ts">
  import { Dialog, DialogTitle } from '$lib/components/acerola-dialog/acerola-dialog';
  import DialogContent from '$lib/components/acerola-responsive-dialog-content/acerola-responsive-dialog-content.svelte';
  import {
    SOFTWARE_PROJECT_COLORS,
    SOFTWARE_PROJECT_COLOR_LABELS,
    SOFTWARE_PROJECT_STATUSES,
    SOFTWARE_PROJECT_STATUS_LABELS,
  } from '@template/shared/domain/software-project.util';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import SelectField from '$lib/components/acerola-select-field/acerola-select-field.svelte';
  import TextField from '$lib/components/acerola-text-field/acerola-text-field.svelte';
  import {
    type SoftwareProjectFormModel,
  } from '$lib/hooks/use-software-project-form/use-software-project-form.svelte';

  let {
    open = $bindable(false),
    model,
    onClose,
  }: {
    open: boolean;
    model: SoftwareProjectFormModel;
    onClose: () => void;
  } = $props();

  const isEdit = $derived(model.data.mode === 'edit');

  const statusOptions = SOFTWARE_PROJECT_STATUSES.map((status) => ({
    value: status,
    label: SOFTWARE_PROJECT_STATUS_LABELS[status],
  }));

  const colorOptions = SOFTWARE_PROJECT_COLORS.map((col) => ({
    value: col,
    label: SOFTWARE_PROJECT_COLOR_LABELS[col],
  }));
</script>

<Dialog {open} onOpenChange={(value) => { if (!value) onClose(); }}>
  <DialogContent>
    <div class="flex items-center justify-between">
      <DialogTitle class="text-lg font-semibold text-foreground">
        {isEdit ? 'Editar Sistema' : 'Novo Sistema'}
      </DialogTitle>
    </div>

    {#if model.state.error}
      <div class="rounded-box border border-destructive/40 bg-destructive-soft p-3 text-xs text-destructive">
        {model.state.error}
      </div>
    {/if}

    <form
      onsubmit={(e) => {
        e.preventDefault();
        model.actions.onSubmit();
      }}
      class="flex flex-col gap-4"
    >
      <TextField
        data={{
          label: 'Nome do sistema',
          name: 'name',
          value: model.data.fields.name.value,
          placeholder: 'Ex: Acerola Ticket, Portal do Cliente, ERP',
          isRequired: true,
        }}
        state={{
          error: model.data.fields.name.error,
          isDisabled: model.state.isSubmitting,
        }}
        actions={{
          onChange: (val: string) => model.actions.onChange('name', val),
          onBlur: () => model.actions.onBlur('name'),
        }}
      />

      <TextField
        data={{
          label: 'Repositório no GitHub',
          name: 'repositoryUrl',
          value: model.data.fields.repositoryUrl.value,
          placeholder: 'Ex: vinicius-gpl/acerola-ticket ou https://github.com/...',
          isRequired: true,
        }}
        state={{
          error: model.data.fields.repositoryUrl.error,
          isDisabled: model.state.isSubmitting,
        }}
        actions={{
          onChange: (val: string) => model.actions.onChange('repositoryUrl', val),
          onBlur: () => model.actions.onBlur('repositoryUrl'),
        }}
      />

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium text-foreground">Situação</span>
          <SelectField
            data={{
              value: model.data.fields.status.value,
              options: statusOptions,
            }}
            actions={{
              onChange: (val) => model.actions.onChange('status', val),
            }}
          />
        </div>

        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium text-foreground">Cor identificadora</span>
          <SelectField
            data={{
              value: model.data.fields.color.value,
              options: colorOptions,
            }}
            actions={{
              onChange: (val) => model.actions.onChange('color', val),
            }}
          />
        </div>
      </div>

      <!-- Só informação: diz quem responde pelo sistema, sem mudar a quem os chamados vão. -->
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-foreground">Responsável</span>
        <SelectField
          data={{
            value: model.data.fields.responsibleId.value,
            options: model.data.responsibleOptions,
          }}
          ui={{ ariaLabel: 'Responsável pelo sistema' }}
          state={{ isDisabled: model.state.isSubmitting }}
          actions={{
            onChange: (val) => model.actions.onChange('responsibleId', val),
          }}
        />
      </div>

      <TextField
        data={{
          label: 'Descrição',
          name: 'description',
          value: model.data.fields.description.value,
          placeholder: 'O que este sistema faz e quais áreas o utilizam',
        }}
        state={{
          error: model.data.fields.description.error,
          isDisabled: model.state.isSubmitting,
        }}
        actions={{
          onChange: (val: string) => model.actions.onChange('description', val),
          onBlur: () => model.actions.onBlur('description'),
        }}
      />

      <div class="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 border-t border-border/60 pt-4">
        <ActionButton
          data={{ label: 'Cancelar' }}
          ui={{ variant: 'secondary' }}
          actions={{ onClick: onClose }}
        />
        <ActionButton
          data={{ label: 'Salvar', loadingLabel: 'Salvando…' }}
          ui={{ variant: 'primary' }}
          state={{ isLoading: model.state.isSubmitting }}
          actions={{ onClick: model.actions.onSubmit }}
        />
      </div>
    </form>
  </DialogContent>
</Dialog>
