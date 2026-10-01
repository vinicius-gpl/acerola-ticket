<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import RoleFormDialog from './role-form-dialog.svelte';

  const emptyFields = {
    userId: { value: '', error: null },
    userEmail: { value: '', error: null },
    context: { value: 'sistema', error: null },
    role: { value: 'user', error: null },
  };

  const baseActions = { onChange: fn(), onBlur: fn(), onSubmit: fn(), onClose: fn() };

  const { Story } = defineMeta({
    title: 'Components/RoleFormDialog',
    component: RoleFormDialog,
  });
</script>

<Story
  name="Create"
  args={{
    data: { mode: 'create', fields: emptyFields },
    state: { isOpen: true },
    actions: baseActions,
  }}
/>

<Story
  name="Edit"
  args={{
    data: {
      mode: 'edit',
      fields: {
        userId: { value: 'usr_1', error: null },
        userEmail: { value: 'ana@empresa.com.br', error: null },
        context: { value: 'manutencao', error: null },
        role: { value: 'manager', error: null },
      },
    },
    state: { isOpen: true },
    actions: baseActions,
  }}
/>

<Story
  name="WithFieldError"
  args={{
    data: {
      mode: 'create',
      fields: {
        ...emptyFields,
        userId: { value: '', error: 'Identificador é obrigatório' },
      },
    },
    state: { isOpen: true },
    actions: baseActions,
  }}
/>

<Story
  name="Submitting"
  args={{
    data: { mode: 'create', fields: emptyFields },
    state: { isOpen: true, isSubmitting: true },
    actions: baseActions,
  }}
/>

<Story
  name="WithServerError"
  args={{
    data: { mode: 'create', fields: emptyFields },
    state: { isOpen: true, error: 'Não foi possível salvar o cargo interno.' },
    actions: baseActions,
  }}
/>
