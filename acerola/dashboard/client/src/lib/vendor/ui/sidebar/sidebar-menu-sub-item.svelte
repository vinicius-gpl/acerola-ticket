<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn.util';

  type Props = HTMLAttributes<HTMLLIElement> & {
    children?: Snippet;
  };

  let { class: className, children, ...restProps }: Props = $props();
</script>

<li
  data-slot="sidebar-menu-sub-item"
  data-sidebar="menu-sub-item"
  class={cn('group/menu-sub-item relative', className)}
  {...restProps}
>
  {@render children?.()}
</li>
