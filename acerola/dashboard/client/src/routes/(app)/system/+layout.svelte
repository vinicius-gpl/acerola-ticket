<script lang="ts">
  import type { Snippet } from 'svelte';
  import { requiresSystemGithub } from '@template/shared/domain/system-access.util';

  import AppShell from '$lib/components/acerola-app-shell/acerola-app-shell.svelte';
  import { useAppShellModel } from '$lib/hooks/use-app-shell/use-app-shell.svelte';
  import { SYSTEM_NAV_ITEMS } from '$lib/navigation/navigation';
  import type { LayoutData } from './$types';
  import GithubLinkGate from './components/acerola-github-link-gate/acerola-github-link-gate.svelte';
  import { useGithubConnectionModel } from '$lib/hooks/use-github-connection/use-github-connection.svelte';

  /**
   * A CASCA DO SISTEMA — o menu de `/system/...`.
   *
   * O contexto e a lista de menu entram por parâmetro, fixos nesta pasta: este módulo não
   * conhece a lista dos outros dois, e não existe filtro nenhum em tempo de execução. Trocar
   * de contexto é trocar de endereço, e aí quem monta é a casca do outro módulo.
   *
   * `data.user` vem da guarda em `(app)/+layout.ts`, um nível acima.
   */
  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  const shell = useAppShellModel({
    user: data.user,
    context: 'sistema',
    items: SYSTEM_NAV_ITEMS,
  });
  const github = useGithubConnectionModel(data.user.id, requiresSystemGithub(data.user));
</script>

{#if requiresSystemGithub(data.user) && !github.state.isLinked}
  <GithubLinkGate state={github.state} actions={github.actions} />
{:else}
  <AppShell data={shell.data} ui={shell.ui} state={shell.state} actions={shell.actions}>
    {@render children()}
  </AppShell>
{/if}
