<script lang="ts">
  import ResetPasswordScreen from '$lib/components/reset-password-screen/reset-password-screen.svelte';
  import { useResetPasswordModel } from '$lib/hooks/use-reset-password/use-reset-password.svelte';

  /** A rota só compõe. O token do link vem do endereço e é lido pelo hook. */
  const model = useResetPasswordModel();
</script>

<svelte:head>
  <title>Crie sua senha</title>
</svelte:head>

<ResetPasswordScreen data={model.data} state={model.state} actions={model.actions} />
