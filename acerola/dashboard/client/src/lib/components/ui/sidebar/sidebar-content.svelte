<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn.util';

  type Props = HTMLAttributes<HTMLDivElement> & {
    children?: Snippet;
  };

  let { class: className, children, ...restProps }: Props = $props();
</script>

<div
  data-slot="sidebar-content"
  data-sidebar="content"
  class={cn(
    'flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</div>
