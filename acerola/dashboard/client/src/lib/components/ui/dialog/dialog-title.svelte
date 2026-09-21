<script lang="ts">
  import { cn } from '$lib/utils/cn.util';
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: DialogPrimitive.TitleProps & { children?: Snippet } = $props();
</script>

<DialogPrimitive.Title
  bind:ref
  data-slot="dialog-title"
  class={cn("text-lg leading-none font-semibold", className)}
  {...restProps}
>
  {@render children?.()}
</DialogPrimitive.Title>
