<script lang="ts">
  import { Dialog as SheetPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    ref = $bindable(null),
    children,
    ...restProps
  }: SheetPrimitive.CloseProps & { children?: Snippet } = $props();
</script>

<SheetPrimitive.Close bind:ref data-slot="sheet-close" {...restProps}>
  {@render children?.()}
</SheetPrimitive.Close>
