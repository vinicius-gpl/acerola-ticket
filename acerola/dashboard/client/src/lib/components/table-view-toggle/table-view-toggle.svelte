<script lang="ts">
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import Table from '@lucide/svelte/icons/table';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';

  /**
   * "Ver em cards" / "Ver em tabela" — ao lado de cada lista que já tinha os dois formatos
   * (cards no celular, tabela no desktop). Cuida da própria preferência (`lib/hooks/use-table-view`), do
   * mesmo jeito que o `ThemeToggle` cuida do próprio tema: a tela não guarda nenhum estado, só
   * coloca o botão.
   *
   * Sem rótulo visível de propósito — só o ícone, do tamanho de um botão secundário de linha de
   * tabela. O nome completo mora no `aria-label`/dica, pra não competir com o título da tela.
   */
  const tableView = useTableViewModel();
</script>

<ActionButton
  data={{ label: tableView.forceCards ? 'Ver em tabela' : 'Ver sempre em cards' }}
  ui={{
    variant: 'ghost',
    size: 'sm',
    icon: tableView.forceCards ? Table : LayoutGrid,
    isIconOnly: true,
  }}
  actions={{ onClick: tableView.actions.onToggle }}
/>
