<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    children,
    ...restProps
  }: SelectPrimitive.GroupProps & { children?: Snippet } = $props();
</script>

<SelectPrimitive.Group data-slot="select-group" {...restProps}>
  {@render children?.()}
</SelectPrimitive.Group>
