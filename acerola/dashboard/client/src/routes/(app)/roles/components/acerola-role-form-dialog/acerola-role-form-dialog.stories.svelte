<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import RoleFormDialog from './acerola-role-form-dialog.svelte';

  const emptyFields = {
    userId: { value: '', error: null },
    userEmail: { value: '', error: null },
    context: { value: 'sistema', error: null },
    role: { value: 'user', error: null },
  };

  const baseActions = { onChange: fn(), onBlur: fn(), onSubmit: fn(), onClose: fn() };

  const { Story } = defineMeta({
    title: 'Features/Roles/AcerolaRoleFormDialog',
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

<!-- O caso que vazava a borda: pessoa escolhida (cartão + "Trocar pessoa") com nome e e-mail
     longos, ao lado dos três cartões de área. -->
<Story
  name="WithSelectedPerson"
  args={{
    data: {
      mode: 'create',
      users: [
        {
          id: 'usr_2',
          name: 'Wellington Queiroz de Albuquerque Nogueira',
          email: 'wellington.queiroz.albuquerque@empresa-exemplo.com.br',
          role: 'admin',
        },
      ],
      fields: {
        userId: { value: 'usr_2', error: null },
        userEmail: { value: 'wellington.queiroz.albuquerque@empresa-exemplo.com.br', error: null },
        context: { value: 'infra', error: null },
        role: { value: 'manager', error: null },
      },
    },
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
