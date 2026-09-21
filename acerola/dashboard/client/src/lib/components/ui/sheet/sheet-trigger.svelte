<script lang="ts">
  import { Dialog as SheetPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    ref = $bindable(null),
    children,
    ...restProps
  }: SheetPrimitive.TriggerProps & { children?: Snippet } = $props();
</script>

<SheetPrimitive.Trigger bind:ref data-slot="sheet-trigger" {...restProps}>
  {@render children?.()}
</SheetPrimitive.Trigger>
