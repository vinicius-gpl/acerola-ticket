<script lang="ts">
  import ForgotPasswordScreen from '$lib/components/forgot-password-screen/forgot-password-screen.svelte';
  import { useForgotPasswordModel } from '$lib/hooks/use-forgot-password/use-forgot-password.svelte';

  /**
   * A rota só compõe: chama o hook, passa para a tela (CONTRIBUTING §3).
   *
   * Fora do grupo `(app)`, como o login: quem está aqui ainda não tem sessão, e a guarda
   * daquele grupo devolveria a pessoa para `/login` num laço.
   */
  const model = useForgotPasswordModel();
</script>

<svelte:head>
  <title>Esqueci minha senha</title>
</svelte:head>

<ForgotPasswordScreen data={model.data} state={model.state} actions={model.actions} />
