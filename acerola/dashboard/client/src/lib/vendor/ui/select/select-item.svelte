<script lang="ts">
  import { cn } from '$lib/utils/cn.util';
  import CheckIcon from '@lucide/svelte/icons/check';
  import { Select as SelectPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    value,
    label = value,
    disabled = false,
    ref = $bindable(null),
    children: itemChildren,
    ...restProps
  }: SelectPrimitive.ItemProps & { children?: Snippet } = $props();
</script>

<SelectPrimitive.Item
  bind:ref
  {value}
  {label}
  {disabled}
  data-slot="select-item"
  class={cn(
    "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
    className
  )}
  {...restProps}
>
  {#snippet children({ selected })}
    <span
      data-slot="select-item-indicator"
      class="absolute right-2 flex size-3.5 items-center justify-center"
    >
      {#if selected}
        <CheckIcon class="size-4" />
      {/if}
    </span>
    {@render itemChildren?.()}
  {/snippet}
</SelectPrimitive.Item>
