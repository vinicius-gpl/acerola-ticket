<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import ForgotPasswordScreen from './forgot-password-screen.svelte';

  const emptyField = { value: '', error: null };

  const baseActions = { onChange: fn(), onBlur: fn(), onSubmit: fn() };

  const { Story } = defineMeta({
    title: 'Composers/ForgotPasswordScreen',
    component: ForgotPasswordScreen,
  });
</script>

<Story name="Default" args={{ data: { field: emptyField }, actions: baseActions }} />

<!-- O erro de campo aparece colado nele, com o texto do schema compartilhado. -->
<Story
  name="WithFieldError"
  args={{
    data: { field: { value: 'ana', error: 'Informe um e-mail válido' } },
    actions: baseActions,
  }}
/>

<Story
  name="Submitting"
  args={{
    data: { field: { value: 'ana@empresa.com.br', error: null } },
    state: { isSubmitting: true },
    actions: baseActions,
  }}
/>

<!-- Depois de enviar, o formulário some e dá lugar ao aviso — que NÃO confirma se a conta
     existe, de propósito. -->
<Story
  name="Sent"
  args={{
    data: { field: { value: 'ana@empresa.com.br', error: null } },
    state: { isSent: true },
    actions: baseActions,
  }}
/>

<!-- Caso limite: clicou várias vezes seguidas e bateu no limite do serviço. -->
<Story
  name="TooManyRequests"
  args={{
    data: { field: { value: 'ana@empresa.com.br', error: null } },
    state: { error: 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.' },
    actions: baseActions,
  }}
/>
