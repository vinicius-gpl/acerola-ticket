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
  data-slot="sidebar-group-content"
  data-sidebar="group-content"
  class={cn('w-full text-sm', className)}
  {...restProps}
>
  {@render children?.()}
</div>
