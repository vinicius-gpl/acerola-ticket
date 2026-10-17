<script lang="ts">
  import { page } from '$app/state';
  import LoginScreen from './components/acerola-login-screen/acerola-login-screen.svelte';
  import { useLoginModel } from '$lib/hooks/use-login/use-login.svelte';

  /**
   * A rota só compõe: chama o hook, passa para a tela (CONTRIBUTING §3).
   *
   * Fora do grupo `(app)` de propósito — sem `AppShell`, sem a guarda de sessão de
   * `routes/(app)/+layout.ts`, que redirecionaria de volta para cá num laço infinito.
   */
  /* Lido uma vez: é o endereço em que a pessoa estava quando a guarda a mandou para cá. */
  const model = useLoginModel({ returnTo: page.data.returnTo ?? '/' });
</script>

<svelte:head>
  <title>Entrar</title>
</svelte:head>

<LoginScreen data={model.data} state={model.state} actions={model.actions} />
