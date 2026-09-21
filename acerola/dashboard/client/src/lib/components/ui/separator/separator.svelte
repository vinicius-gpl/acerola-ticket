<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import { Separator as SeparatorPrimitive } from 'bits-ui';

  let {
    class: className,
    orientation = 'horizontal',
    decorative = true,
    ref = $bindable(null),
    ...restProps
  }: SeparatorPrimitive.RootProps = $props();
</script>

<SeparatorPrimitive.Root
  bind:ref
  {orientation}
  {decorative}
  data-slot="separator"
  class={cn(
    "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
    className
  )}
  {...restProps}
/>
