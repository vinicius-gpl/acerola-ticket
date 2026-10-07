<script lang="ts">
  import type { Snippet } from 'svelte';

  import AppShell from '$lib/components/acerola-app-shell/acerola-app-shell.svelte';
  import { useAppShellModel } from '$lib/hooks/use-app-shell/use-app-shell.svelte';
  import { useAreaContextModel } from '$lib/hooks/use-area-context/use-area-context.svelte';
  import { NAV_ITEMS_BY_CONTEXT } from '$lib/navigation/navigation';
  import type { LayoutData } from './$types';

  /**
   * A CASCA DO PERFIL — uma tela da PESSOA, não de módulo nenhum.
   *
   * O perfil é um só: ter uma cópia dele dentro de cada módulo faria a pessoa editar o nome em
   * Infraestrutura e não ver a mudança em Manutenção.
   *
   * Como não há módulo dono, o menu é o do ÚLTIMO contexto em que a pessoa esteve — é a única
   * pergunta que esse valor guardado no navegador responde do lado de cá. Quem entra aqui vem
   * de uma tela de módulo, e é esse menu que ela espera continuar vendo ao voltar.
   *
   * A casca se repete aqui e nos Cargos de propósito: `/profile` e `/roles` são irmãos, e uma
   * casca só para os dois exigiria uma pasta agrupadora — que juntaria as duas telas numa
   * única "feature" aos olhos da checagem de design, e passaria a acusar o componente que as
   * duas compartilham. Vinte linhas repetidas valem menos que essa confusão.
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
