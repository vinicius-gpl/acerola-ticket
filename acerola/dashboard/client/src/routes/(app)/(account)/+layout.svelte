<script lang="ts">
  import type { Snippet } from 'svelte';

  import AppShell from '$lib/components/acerola-app-shell/acerola-app-shell.svelte';
  import { useAppShellModel } from '$lib/hooks/use-app-shell/use-app-shell.svelte';
  import { useAreaContextModel } from '$lib/hooks/use-area-context/use-area-context.svelte';
  import { NAV_ITEMS_BY_CONTEXT } from '$lib/navigation/navigation';
  import type { LayoutData } from './$types';

  /**
   * A CASCA DAS TELAS SEM MÓDULO — o perfil e os cargos.
   *
   * São telas da PESSOA, não de contexto nenhum: o endereço (`/profile`, `/roles`) não diz
   * área, e os parênteses do nome da pasta são só agrupamento do SvelteKit — não entram no
   * endereço. Elas existem aqui, e não dentro dos módulos, porque o perfil é um só: ter três
   * cópias dele faria a pessoa editar o nome em Infraestrutura e não ver a mudança em
   * Manutenção.
   *
   * Como não há módulo dono, o menu é o do ÚLTIMO contexto em que a pessoa esteve — é a única
   * pergunta que esse valor guardado no navegador responde do lado de cá. Quem entra aqui
   * vem de uma tela de módulo, e é esse menu que ela espera continuar vendo ao voltar.
   */
  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  const lastContext = useAreaContextModel().context;

  const shell = useAppShellModel({
    user: data.user,
    context: lastContext,
    items: NAV_ITEMS_BY_CONTEXT[lastContext],
  });
</script>

<AppShell data={shell.data} ui={shell.ui} state={shell.state} actions={shell.actions}>
  {@render children()}
</AppShell>
