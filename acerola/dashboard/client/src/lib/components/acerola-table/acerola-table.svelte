<script lang="ts" module>
  import type { Snippet } from 'svelte';
  import type { HTMLTableAttributes } from 'svelte/elements';

  /**
   * A tabela da casa: o `ui/table` do shadcn dentro de uma superfície (raio, borda, fundo e
   * sombra de cartão), com um rodapé opcional para a fonte do dado e a contagem.
   *
   * Tudo isto vivia editado à mão dentro de `ui/table`, e sumiria no próximo `shadcn add`.
   * Agora o `ui/` é o original, e a aparência mora aqui e nas peças ao lado
   * (`acerola-table-row`, `-cell`, `-head`…). Quem usa importa tudo de `acerola-table.ts`.
   */
  export type AcerolaTableProps = HTMLTableAttributes & {
    ref?: HTMLTableElement | null;
    /** Classes da superfície em volta — para a tabela que já mora dentro de um cartão. */
    containerClass?: string;
    /** Fonte do dado à esquerda, contagem à direita. */
    footer?: Snippet;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { Table } from '$lib/components/ui/table';
  import { cn } from '$lib/utils/cn';

  let {
    class: className,
    containerClass,
    ref = $bindable(null),
    footer,
    children,
    ...restProps
  }: AcerolaTableProps = $props();
</script>

<div
  data-slot="table-surface"
  class={cn(
    'border-border bg-card rounded-surface w-full overflow-hidden border shadow-xs',
    containerClass,
  )}
>
  <!-- Quem rola para o lado é a caixa de dentro (o contêiner do próprio shadcn), não a página. -->
  <Table bind:ref class={cn('text-left', className)} {...restProps}>
    {@render children?.()}
  </Table>

  {#if footer}
    <div
      class="border-border/80 bg-muted/40 text-ink-500 flex items-center justify-between border-t px-6 py-3 text-xs"
    >
      {@render footer()}
    </div>
  {/if}
</div>
