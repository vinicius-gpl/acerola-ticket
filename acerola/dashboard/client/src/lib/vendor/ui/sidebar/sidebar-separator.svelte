<script lang="ts">
  import { Separator as SeparatorPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils/cn.util';
  import { Separator } from '../separator';

  let { class: className, ...restProps }: SeparatorPrimitive.RootProps = $props();
</script>

<Separator
  data-sidebar="separator"
  class={cn('mx-2 w-auto bg-sidebar-border', className)}
  {...restProps}
/>
