<script lang="ts" module>
  import type { Snippet } from 'svelte';

  /**
   * Um bloco que abre e fecha: o título fica sempre à vista, o conteúdo aparece quando a pessoa
   * pede. Envolve o `ui/collapsible` do shadcn. Serve para o que é detalhe — filtros avançados,
   * explicação longa —, nunca para esconder o que a pessoa precisa ver para decidir.
   *
   * `state.isOpen` é só como o bloco NASCE. Depois quem manda é o clique; a tela é avisada por
   * `actions.onOpenChange` se quiser lembrar a escolha.
   */
  export type AcerolaCollapsibleProps = {
    data: { title: string };
    ui?: { className?: string };
    state?: { isOpen?: boolean; isDisabled?: boolean };
    actions?: { onOpenChange?: (isOpen: boolean) => void };
    children?: Snippet;
  };
</script>

<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { untrack } from 'svelte';

  import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
  } from '$lib/components/ui/collapsible';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: blockState, actions, children }: AcerolaCollapsibleProps = $props();

  /* `$state` puramente visual: aberto ou fechado. */
  let isOpen = $state(untrack(() => blockState?.isOpen ?? false));
</script>

<Collapsible
  bind:open={isOpen}
  disabled={blockState?.isDisabled}
  onOpenChange={(next) => actions?.onOpenChange?.(next)}
  class={cn('border-border bg-card rounded-box border', ui?.className)}
>
  <CollapsibleTrigger
    class="text-ink-900 flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
  >
    <span class="break-words">{data.title}</span>
    <ChevronDown
      class={cn('text-ink-500 size-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
      aria-hidden="true"
    />
  </CollapsibleTrigger>

  <CollapsibleContent class="border-border/60 text-ink-700 border-t px-4 py-3 text-sm">
    {@render children?.()}
  </CollapsibleContent>
</Collapsible>
