<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import { Separator as SeparatorPrimitive } from 'bits-ui';

  let {
    class: className,
    ref = $bindable(null),
    ...restProps
  }: SeparatorPrimitive.RootProps = $props();
</script>

<SeparatorPrimitive.Root
  bind:ref
  data-slot="select-separator"
  class={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
  {...restProps}
/>
