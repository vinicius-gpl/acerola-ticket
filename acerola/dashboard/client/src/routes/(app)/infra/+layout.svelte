<script lang="ts">
  import type { Snippet } from 'svelte';

  import AppShell from '$lib/components/acerola-app-shell/acerola-app-shell.svelte';
  import { useAppShellModel } from '$lib/hooks/use-app-shell/use-app-shell.svelte';
  import { INFRA_NAV_ITEMS } from '$lib/navigation/navigation';
  import type { LayoutData } from './$types';

  /**
   * A CASCA DA INFRAESTRUTURA — o menu de `/infra/...`.
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
    context: 'infra',
    items: INFRA_NAV_ITEMS,
  });
</script>

<AppShell data={shell.data} ui={shell.ui} state={shell.state} actions={shell.actions}>
  {@render children()}
</AppShell>
