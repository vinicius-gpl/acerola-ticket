<script lang="ts">
  import type { Snippet } from 'svelte';

  import AppShell from '$lib/components/acerola-app-shell/acerola-app-shell.svelte';
  import { useAppShellModel } from '$lib/hooks/use-app-shell/use-app-shell.svelte';
  import type { LayoutData } from './$types';

  /**
   * A casca (menu lateral) só existe aqui dentro — a tela de login, fora deste grupo, não a
   * usa. `data.user` vem da guarda em `+layout.ts`: quando este componente roda, a sessão já
   * foi conferida.
   *
   * O `ui` é o menu DO CONTEXTO atual (Infraestrutura, Sistema ou Manutenção) — quem monta a
   * lista é o model, a partir de `lib/navigation/navigation.ts`.
   */
  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  const shell = useAppShellModel({ user: data.user });
</script>

<AppShell data={shell.data} ui={shell.ui} state={shell.state} actions={shell.actions}>
  {@render children()}
</AppShell>
