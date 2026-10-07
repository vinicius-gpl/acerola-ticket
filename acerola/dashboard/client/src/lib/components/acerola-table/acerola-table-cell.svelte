<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import { TableCell } from '$lib/components/ui/table';
  import { cn } from '$lib/utils/cn';

  /* A célula de dado. O shadcn não deixa o texto quebrar (`whitespace-nowrap`); aqui ele quebra,
     porque nome e descrição compridos não podem alargar a tabela. Só a célula de ações (a que
     tem botão) fica numa linha só. */
  let { ref = $bindable(null), class: className, ...restProps }: ComponentProps<typeof TableCell> =
    $props();
</script>

<TableCell
  bind:ref
  class={cn(
    'px-6 py-3.5 text-sm whitespace-normal [&>[role=checkbox]]:translate-y-[2px]',
    '[&:has(button)]:whitespace-nowrap [&_button]:align-middle',
    className,
  )}
  {...restProps}
/>
