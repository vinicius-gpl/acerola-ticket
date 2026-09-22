<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import ResetPasswordScreen from './reset-password-screen.svelte';

  const emptyFields = {
    password: { value: '', error: null },
    passwordConfirmation: { value: '', error: null },
  };

  const baseActions = { onChange: fn(), onBlur: fn(), onSubmit: fn() };

  const { Story } = defineMeta({
    title: 'Composers/ResetPasswordScreen',
    component: ResetPasswordScreen,
  });
</script>

<Story name="Default" args={{ data: { fields: emptyFields }, actions: baseActions }} />

<!-- O erro da confirmação aponta para o campo da confirmação: é nele que a pessoa mexe. -->
<Story
  name="PasswordsDoNotMatch"
  args={{
    data: {
      fields: {
        password: { value: '••••••••', error: null },
        passwordConfirmation: { value: '•••••••', error: 'As duas senhas precisam ser iguais' },
      },
    },
    actions: baseActions,
  }}
/>

<Story
  name="Submitting"
  args={{
    data: {
      fields: {
        password: { value: '••••••••', error: null },
        passwordConfirmation: { value: '••••••••', error: null },
      },
    },
    state: { isSubmitting: true },
    actions: baseActions,
  }}
/>

<!-- Caso limite: link vencido ou endereço digitado na mão, sem token. A tela nem mostra os
     campos — preencher para ser recusado no fim seria pior. -->
<Story
  name="InvalidLink"
  args={{ data: { fields: emptyFields }, state: { isLinkValid: false }, actions: baseActions }}
/>
