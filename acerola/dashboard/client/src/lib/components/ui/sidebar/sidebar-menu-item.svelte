<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn';

  type Props = HTMLAttributes<HTMLLIElement> & {
    children?: Snippet;
  };

  let { class: className, children, ...restProps }: Props = $props();
</script>

<li
  data-slot="sidebar-menu-item"
  data-sidebar="menu-item"
  class={cn('group/menu-item relative', className)}
  {...restProps}
>
  {@render children?.()}
</li>
