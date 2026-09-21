<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    children,
    ...restProps
  }: DialogPrimitive.PortalProps & { children?: Snippet } = $props();
</script>

<DialogPrimitive.Portal data-slot="dialog-portal" {...restProps}>
  {@render children?.()}
</DialogPrimitive.Portal>
