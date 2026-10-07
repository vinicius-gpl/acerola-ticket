<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import TableViewToggle from './acerola-table-view-toggle.svelte';

  const { Story } = defineMeta({
    title: 'Components/AcerolaTableViewToggle',
    component: TableViewToggle,
  });
</script>

<Story name="Default" />

<!-- Onde ele mora de verdade: ao lado do título de uma lista com modo cards. -->
<Story name="BesidePageHeader">
  <div class="flex w-80 items-center justify-between">
    <span class="text-sm font-semibold">Chamados</span>
    <TableViewToggle />
  </div>
</Story>
