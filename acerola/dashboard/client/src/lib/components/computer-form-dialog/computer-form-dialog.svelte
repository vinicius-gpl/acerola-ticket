<script lang="ts" module>
  import { DEPARTMENTS, DEPARTMENT_LABELS } from '@template/shared/domain/department.util';

  import { type FormFieldState } from '$lib/types/form-field.type';

  export type ComputerFormField = 'name' | 'displayName' | 'responsibleName' | 'department';

  /**
   * O formulário de cadastrar máquina e o de corrigir a identificação dela, num modal.
   *
   * Função pura de props: o valor e o erro de cada campo chegam prontos (`FormFieldState`), e
   * por isso o modal abre no Storybook preenchido, com erro ou enviando — sem servidor e sem
   * biblioteca de formulário no meio.
   *
   * **O nome da máquina só é editável no cadastro.** Depois, quem o informa é a própria
   * máquina, a cada leitura do agente: digitá-lo aqui faria a ficha discordar do que o agente
   * manda, e a pessoa procuraria no inventário um nome que não existe em lugar nenhum.
   *
   * A recusa do servidor aparece DENTRO do modal, e ele continua aberto: fechar jogaria fora
   * o que foi digitado.
   */
  export type ComputerFormDialogProps = {
    data: {
      mode: 'create' | 'edit';
      fields: Record<ComputerFormField, FormFieldState>;
    };
    state: { isOpen: boolean; isSubmitting?: boolean; error?: string | null };
    actions: {
      onChange: (field: ComputerFormField, value: string) => void;
      onBlur: (field: ComputerFormField) => void;
      onSubmit: () => void;
      onClose: () => void;
    };
  };

  const DEPARTMENT_OPTIONS = [
    { value: '', label: 'Sem departamento' },
    ...DEPARTMENTS.map((department) => ({
      value: department,
      label: DEPARTMENT_LABELS[department],
    })),
  ];
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

  let { data, state, actions }: ComputerFormDialogProps = $props();

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
        <DialogTitle>{isEdit ? 'Identificação da máquina' : 'Cadastrar computador'}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'Apelido, responsável e departamento. O resto a própria máquina informa.'
            : 'Só o nome é obrigatório. Ao salvar, você recebe o token para instalar o agente nela.'}
        </DialogDescription>
      </DialogHeader>

      <!-- No cadastro o nome é digitado; depois ele é só contexto, e vem do agente. -->
      {#if isEdit}
        <p class="bg-muted/50 text-ink-700 rounded-lg px-3 py-2 text-sm break-words">
          <span class="text-ink-500 block text-xs">Nome informado pela máquina</span>
          {fields.name.value}
        </p>
      {:else}
        <TextField
          data={{
            label: 'Nome da máquina',
            name: 'name',
            value: fields.name.value,
            placeholder: 'Como ela aparece na rede, por exemplo RECEPCAO-01',
          }}
          state={{
            error: fields.name.error,
            isDisabled: state.isSubmitting,
            isAutoFocused: true,
          }}
          actions={{
            onChange: (value: string) => actions.onChange('name', value),
            onBlur: () => actions.onBlur('name'),
          }}
        />
      {/if}

      <TextField
        data={{
          label: 'Apelido',
          name: 'displayName',
          value: fields.displayName.value,
          placeholder: 'Como o pessoal chama essa máquina',
        }}
        state={{
          error: fields.displayName.error,
          isDisabled: state.isSubmitting,
          isAutoFocused: isEdit,
        }}
        actions={{
          onChange: (value: string) => actions.onChange('displayName', value),
          onBlur: () => actions.onBlur('displayName'),
        }}
      />

      <TextField
        data={{
          label: 'Responsável',
          name: 'responsibleName',
          value: fields.responsibleName.value,
          placeholder: 'Quem usa a máquina no dia a dia',
        }}
        state={{ error: fields.responsibleName.error, isDisabled: state.isSubmitting }}
        actions={{
          onChange: (value: string) => actions.onChange('responsibleName', value),
          onBlur: () => actions.onBlur('responsibleName'),
        }}
      />

      <div class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Departamento</span>
        <SelectField
          data={{ value: fields.department.value, options: DEPARTMENT_OPTIONS }}
          ui={{ ariaLabel: 'Departamento' }}
          state={{ isDisabled: state.isSubmitting }}
          actions={{ onChange: (value: string) => actions.onChange('department', value) }}
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
          data={{
            label: isEdit ? 'Salvar' : 'Cadastrar computador',
            loadingLabel: 'Salvando…',
          }}
          ui={{ className: 'sm:w-auto' }}
          state={{ isLoading: state.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
