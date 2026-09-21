<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import { Avatar as AvatarPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: AvatarPrimitive.FallbackProps & { children?: Snippet } = $props();
</script>

<AvatarPrimitive.Fallback
  bind:ref
  data-slot="avatar-fallback"
  class={cn(
    "flex size-full items-center justify-center rounded-full bg-muted",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</AvatarPrimitive.Fallback>
