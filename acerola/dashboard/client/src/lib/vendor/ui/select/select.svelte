<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  /* `RootProps` é uma union discriminada por `type` (`single` × `multiple`, cada um com um
     `value` diferente); este componente só cobre o caso `single`, que é o único usado no
     projeto. */
  type SingleRootProps = Extract<SelectPrimitive.RootProps, { type: 'single' }>;

  let {
    value = $bindable(),
    open = $bindable(false),
    type = 'single',
    children,
    ...restProps
  }: SingleRootProps & { children?: Snippet } = $props();
</script>

<SelectPrimitive.Root
  {type}
  bind:value
  bind:open
  {...restProps}
>
  {@render children?.()}
</SelectPrimitive.Root>
