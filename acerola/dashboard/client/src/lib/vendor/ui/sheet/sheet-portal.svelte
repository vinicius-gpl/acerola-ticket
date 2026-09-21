<script lang="ts">
  import { Dialog as SheetPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    children,
    ...restProps
  }: SheetPrimitive.PortalProps & { children?: Snippet } = $props();
</script>

<SheetPrimitive.Portal data-slot="sheet-portal" {...restProps}>
  {@render children?.()}
</SheetPrimitive.Portal>
