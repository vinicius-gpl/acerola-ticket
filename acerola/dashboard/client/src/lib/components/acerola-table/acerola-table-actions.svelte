<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    children,
    ...restProps
  }: HTMLAttributes<HTMLDivElement> & { children?: Snippet } = $props();
</script>

<div
  data-slot="table-actions"
  class={cn('inline-flex items-center justify-end gap-1.5 align-middle', className)}
  {...restProps}
>
  {@render children?.()}
</div>
