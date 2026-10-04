<script lang="ts">
  /**
   * As peças da tabela entram por `children` e o rodapé por snippet — e snippet só se escreve
   * dentro de um componente. Este casulo monta uma tabela pequena para o teste olhar.
   */
  import {
    Table,
    TableActions,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from './acerola-table';

  let {
    hasFooter = false,
    containerClass,
    cellClass,
  }: { hasFooter?: boolean; containerClass?: string; cellClass?: string } = $props();
</script>

{#snippet content()}
  <TableHeader>
    <TableRow>
      <TableHead>Peça</TableHead>
      <TableHead><span class="sr-only">Ações</span></TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell class={cellClass}>Memória 8 GB</TableCell>
      <TableCell>
        <TableActions><button type="button">Ver histórico</button></TableActions>
      </TableCell>
    </TableRow>
  </TableBody>
{/snippet}

{#if hasFooter}
  <Table {containerClass}>
    {@render content()}
    {#snippet footer()}
      <span>Estoque de peças</span>
      <span>1 peça</span>
    {/snippet}
  </Table>
{:else}
  <Table {containerClass}>{@render content()}</Table>
{/if}
