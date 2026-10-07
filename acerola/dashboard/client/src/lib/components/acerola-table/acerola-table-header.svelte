<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import { TableHeader } from '$lib/components/ui/table';
  import { cn } from '$lib/utils/cn';

  /* O cabeçalho da tabela: faixa de fundo suave, letra pequena em caixa alta. O `ui/table` vem
     sem nada disso; a aparência da casa mora aqui. */
  let { ref = $bindable(null), class: className, ...restProps }: ComponentProps<typeof TableHeader> =
    $props();
</script>

<TableHeader
  bind:ref
  class={cn(
    'border-border/80 bg-muted/70 text-ink-500 border-b text-xs font-semibold tracking-widest uppercase',
    className,
  )}
  {...restProps}
/>
