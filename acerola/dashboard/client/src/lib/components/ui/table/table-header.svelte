<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: HTMLAttributes<HTMLTableSectionElement> & { ref?: HTMLTableSectionElement | null; children?: Snippet } = $props();
</script>

<thead
  bind:this={ref}
  data-slot="table-header"
  class={cn("[&_tr]:border-b", className)}
  {...restProps}
>
  {@render children?.()}
</thead>
