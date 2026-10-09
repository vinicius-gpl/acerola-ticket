<script lang="ts">
  import type { Snippet } from 'svelte';

  import AppShell from '$lib/components/acerola-app-shell/acerola-app-shell.svelte';
  import { useAppShellModel } from '$lib/hooks/use-app-shell/use-app-shell.svelte';
  import { useAreaContextModel } from '$lib/hooks/use-area-context/use-area-context.svelte';
  import { NAV_ITEMS_BY_CONTEXT } from '$lib/navigation/navigation';
  import type { LayoutData } from './$types';

  /**
   * A CASCA DOS CARGOS — quem é o quê em cada contexto, e por isso de contexto nenhum.
   *
   * É a tela que DEFINE o cargo das pessoas nas três áreas. Ela não pode morar dentro de um
   * módulo: estaria dentro justamente do lugar cujo acesso ela controla.
   *
   * Como não há módulo dono, o menu é o do ÚLTIMO contexto em que a pessoa esteve — é a única
   * pergunta que esse valor guardado no navegador responde do lado de cá.
   *
   * A casca se repete aqui e no Perfil de propósito: ver o comentário de
   * `profile/+layout.svelte`.
   */
  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  const lastContext = useAreaContextModel().context;

  const shell = useAppShellModel({
    user: data.user,
    context: lastContext,
    items: NAV_ITEMS_BY_CONTEXT[lastContext],
  });
</script>

<AppShell
  initialSidebarOpen={data.sidebarOpen}
  data={shell.data}
  ui={shell.ui}
  state={shell.state}
  actions={shell.actions}
>
  {@render children()}
</AppShell>
