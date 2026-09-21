<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import TaskFormDialog from './task-form-dialog.component.svelte';

  const emptyFields = {
    title: { value: '', error: null },
    description: { value: '', error: null },
    status: { value: 'todo', error: null },
  };

  const baseActions = { onChange: fn(), onBlur: fn(), onSubmit: fn(), onClose: fn() };

  const { Story } = defineMeta({
    title: 'Composers/TaskFormDialog',
    component: TaskFormDialog,
  });
</script>

<Story name="Create" args={{ data: { mode: 'create', fields: emptyFields }, state: { isOpen: true }, actions: baseActions }} />

<Story
  name="Edit"
  args={{
    data: {
      mode: 'edit',
      fields: {
        title: { value: 'Ligar para o cliente', error: null },
        description: { value: 'Confirmar o horário da visita.', error: null },
        status: { value: 'doing', error: null },
      },
    },
    state: { isOpen: true },
    actions: baseActions,
  }}
/>

<!-- O erro de campo aparece colado nele, com o texto do schema compartilhado. -->
<Story
  name="WithFieldError"
  args={{
    data: {
      mode: 'create',
      fields: { ...emptyFields, title: { value: '', error: 'Informe o título' } },
    },
    state: { isOpen: true },
    actions: baseActions,
  }}
/>

<Story
  name="Submitting"
  args={{
    data: {
      mode: 'edit',
      fields: { ...emptyFields, title: { value: 'Revisar contrato', error: null } },
    },
    state: { isOpen: true, isSubmitting: true },
    actions: baseActions,
  }}
/>

<!-- A recusa do servidor aparece dentro do modal, que continua aberto com o que foi digitado. -->
<Story
  name="WithServerError"
  args={{
    data: {
      mode: 'create',
      fields: { ...emptyFields, title: { value: 'Nova tarefa', error: null } },
    },
    state: { isOpen: true, error: 'Seu perfil é somente leitura e não permite alterar as tarefas.' },
    actions: baseActions,
  }}
/>

<!-- Caso limite: título no limite e descrição perto do máximo (o contador aparece). -->
<Story
  name="LongContent"
  args={{
    data: {
      mode: 'edit',
      fields: {
        title: { value: 'T'.repeat(120), error: null },
        description: { value: 'Descrição longa. '.repeat(100), error: null },
        status: { value: 'todo', error: null },
      },
    },
    state: { isOpen: true },
    actions: baseActions,
  }}
/>
