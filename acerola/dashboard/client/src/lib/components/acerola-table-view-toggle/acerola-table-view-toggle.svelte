<script lang="ts">
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import Table from '@lucide/svelte/icons/table';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';

  /**
   * Tabela ou cards — ao lado de cada lista que tem os dois formatos. Cuida da própria
   * preferência (`lib/hooks/use-table-view`), do mesmo jeito que o `ThemeToggle` cuida do próprio
   * tema: a tela não guarda nenhum estado, só coloca o controle.
   *
   * São DOIS botões lado a lado, e não um ícone que troca: com um ícone só, a pessoa via o
   * formato para onde iria, apagado no canto, e não o formato em que estava. Aqui os dois
   * aparecem sempre, dentro de uma moldura, e o que está valendo fica preenchido com a cor
   * principal — dá para ler o estado sem clicar.
   *
   * Some abaixo de `xl`: no celular e no tablet a lista é sempre em cards (skill `ui-standards`
   * §6.1), então não há o que escolher — e um "Tabela" marcado ali seria mentira.
   */
  const tableView = useTableViewModel();

  function choose(wantsCards: boolean) {
    if (tableView.forceCards === wantsCards) return;

    tableView.actions.onToggle();
  }
</script>

<div
  role="group"
  aria-label="Formato da lista"
  class="border-border bg-card rounded-control hidden items-center gap-0.5 border p-0.5 shadow-xs xl:inline-flex"
>
  <ActionButton
    data={{ label: 'Ver em tabela' }}
    ui={{
      variant: tableView.forceCards ? 'ghost' : 'primary',
      size: 'sm',
      icon: Table,
      isIconOnly: true,
      /* Filho de uma moldura `rounded-control`: o raio de dentro é menor que o de fora. */
      className: 'rounded-box shadow-none',
    }}
    state={{ isPressed: !tableView.forceCards }}
    actions={{ onClick: () => choose(false) }}
  />
  <ActionButton
    data={{ label: 'Ver em cards' }}
    ui={{
      variant: tableView.forceCards ? 'primary' : 'ghost',
      size: 'sm',
      icon: LayoutGrid,
      isIconOnly: true,
      className: 'rounded-box shadow-none',
    }}
    state={{ isPressed: tableView.forceCards }}
    actions={{ onClick: () => choose(true) }}
  />
</div>
