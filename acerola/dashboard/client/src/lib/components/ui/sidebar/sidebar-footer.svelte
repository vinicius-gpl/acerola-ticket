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
  data-slot="sidebar-footer"
  data-sidebar="footer"
  class={cn('flex flex-col gap-2 p-2', className)}
  {...restProps}
>
  {@render children?.()}
</div>
