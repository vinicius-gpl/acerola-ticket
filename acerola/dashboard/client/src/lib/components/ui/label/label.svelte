<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import type { HTMLLabelAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: HTMLLabelAttributes & { ref?: HTMLLabelElement | null; children?: Snippet } = $props();
</script>

<label
  bind:this={ref}
  data-slot="label"
  class={cn(
    "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</label>
