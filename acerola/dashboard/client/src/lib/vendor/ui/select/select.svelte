<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    value = $bindable(),
    open = $bindable(false),
    children,
    ...restProps
  }: SelectPrimitive.RootProps & { children?: Snippet } = $props();
</script>

<SelectPrimitive.Root
  bind:value
  bind:open
  data-slot="select"
  {...restProps}
>
  {@render children?.()}
</SelectPrimitive.Root>
