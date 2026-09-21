<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import { Avatar as AvatarPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: AvatarPrimitive.RootProps & { children?: Snippet } = $props();
</script>

<AvatarPrimitive.Root
  bind:ref
  data-slot="avatar"
  class={cn(
    "relative flex size-8 shrink-0 overflow-hidden rounded-full",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</AvatarPrimitive.Root>
