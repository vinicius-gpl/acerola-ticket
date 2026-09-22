<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import LoginScreen from './login-screen.svelte';

  const emptyFields = {
    email: { value: '', error: null },
    password: { value: '', error: null },
  };

  const baseActions = { onChange: fn(), onBlur: fn(), onSubmit: fn() };

  const { Story } = defineMeta({
    title: 'Composers/LoginScreen',
    component: LoginScreen,
  });
</script>

<Story name="Default" args={{ data: { fields: emptyFields }, actions: baseActions }} />

<!-- O erro de campo aparece colado nele, com o texto do schema compartilhado. -->
<Story
  name="WithFieldError"
  args={{
    data: {
      fields: { ...emptyFields, email: { value: 'ana', error: 'Informe um e-mail válido' } },
    },
    actions: baseActions,
  }}
/>

<Story
  name="Submitting"
  args={{
    data: {
      fields: { email: { value: 'ana@empresa.com.br', error: null }, password: { value: '••••••••', error: null } },
    },
    state: { isSubmitting: true },
    actions: baseActions,
  }}
/>

<!-- A recusa do servidor (e-mail ou senha errados) aparece dentro da tela, sem apagar o que foi digitado. -->
<Story
  name="WithServerError"
  args={{
    data: {
      fields: { email: { value: 'ana@empresa.com.br', error: null }, password: { value: '', error: null } },
    },
    state: { error: 'E-mail ou senha incorretos.' },
    actions: baseActions,
  }}
/>
