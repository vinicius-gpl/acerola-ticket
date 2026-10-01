<script lang="ts" module>
  import {
    ROLE_CONTEXT_LABELS,
    ROLE_CONTEXTS,
    USER_ROLE_LABELS,
    type UserRole,
  } from '@template/shared/schemas/user.schema';
  import { type FormFieldState } from '$lib/types/form-field.type';
  import { type RoleFormField } from '$lib/hooks/use-role-form/use-role-form.svelte';

  export type RoleFormDialogProps = {
    data: {
      mode: 'create' | 'edit';
      fields: Record<RoleFormField, FormFieldState>;
    };
    state: { isOpen: boolean; isSubmitting?: boolean; error?: string | null };
    actions: {
      onChange: (field: RoleFormField, value: string) => void;
      onBlur: (field: RoleFormField) => void;
      onSubmit: () => void;
      onClose: () => void;
    };
  };

  const CONTEXT_OPTIONS = ROLE_CONTEXTS.map((ctx) => ({
    value: ctx,
    label: ROLE_CONTEXT_LABELS[ctx],
  }));

  const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
    { value: 'user', label: USER_ROLE_LABELS.user },
    { value: 'manager', label: `${USER_ROLE_LABELS.manager} (Gestor)` },
    { value: 'admin', label: USER_ROLE_LABELS.admin },
  ];
</script>

<script lang="ts">
  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import SelectField from '$lib/components/select-field/select-field.svelte';
  import SubmitButton from '$lib/components/submit-button/submit-button.svelte';
  import TextField from '$lib/components/text-field/text-field.svelte';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';

  let { data, state, actions }: RoleFormDialogProps = $props();

  const isEdit = $derived(data.mode === 'edit');
  const fields = $derived(data.fields);

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<Dialog open={state.isOpen} onOpenChange={(open) => !open && actions.onClose()}>
  <DialogContent class="max-w-md">
    <DialogHeader>
      <DialogTitle>{isEdit ? 'Alterar cargo interno' : 'Atribuir cargo interno'}</DialogTitle>
      <DialogDescription>
        Defina o cargo da pessoa de acordo com a área/contexto do sistema.
      </DialogDescription>
    </DialogHeader>

    <form novalidate onsubmit={handleSubmit} class="space-y-4">
      {#if state.error}
        <ErrorState
          data={{ title: 'Não foi possível salvar', message: state.error }}
          ui={{ variant: 'inline' }}
        />
      {/if}

      <TextField
        data={{
          label: 'Identificador / ID da pessoa',
          name: 'userId',
          value: fields.userId.value,
          placeholder: 'Ex: usr_123 ou e-mail',
          isRequired: true,
        }}
        state={{ error: fields.userId.error, isDisabled: isEdit }}
        actions={{
          onChange: (val) => actions.onChange('userId', val),
          onBlur: () => actions.onBlur('userId'),
        }}
      />

      <TextField
        data={{
          label: 'E-mail (opcional)',
          name: 'userEmail',
          value: fields.userEmail.value,
          placeholder: 'Ex: ana@empresa.com.br',
        }}
        state={{ error: fields.userEmail.error }}
        actions={{
          onChange: (val) => actions.onChange('userEmail', val),
          onBlur: () => actions.onBlur('userEmail'),
        }}
      />

      <div class="space-y-1.5">
        <label for="role-context-select" class="text-sm font-medium text-foreground">
          Contexto / Área <span class="text-destructive" aria-hidden="true">*</span>
        </label>
        <SelectField
          data={{ value: fields.context.value, options: CONTEXT_OPTIONS }}
          ui={{ ariaLabel: 'Contexto do sistema' }}
          state={{ isDisabled: isEdit }}
          actions={{ onChange: (val) => actions.onChange('context', val) }}
        />
      </div>

      <div class="space-y-1.5">
        <label for="role-value-select" class="text-sm font-medium text-foreground">
          Cargo interno <span class="text-destructive" aria-hidden="true">*</span>
        </label>
        <SelectField
          data={{ value: fields.role.value, options: ROLE_OPTIONS }}
          ui={{ ariaLabel: 'Cargo interno' }}
          actions={{ onChange: (val) => actions.onChange('role', val) }}
        />
      </div>

      <DialogFooter class="mt-6 flex justify-end gap-2">
        <ActionButton
          data={{ label: 'Cancelar' }}
          ui={{ variant: 'secondary' }}
          state={{ isDisabled: state.isSubmitting }}
          actions={{ onClick: actions.onClose }}
        />
        <SubmitButton
          data={{
            label: isEdit ? 'Salvar alterações' : 'Atribuir cargo',
            loadingLabel: 'Salvando…',
          }}
          state={{ isLoading: state.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
