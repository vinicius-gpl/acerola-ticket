<script lang="ts" module>
  import type { Component, Snippet } from 'svelte';

  /**
   * Uma etapa dentro de `Timeline`.
   *
   * `ui.isLast` é passado por quem chama (não descoberto sozinho) porque o número de etapas de
   * um formulário é sempre fixo e conhecido no próprio arquivo — descobrir isso por CSS
   * exigiria selecionar o último irmão de dentro de um componente que não é o pai da lista.
   * Sem a linha, a última etapa não tem "para onde ir depois", que é o efeito certo.
   */
  export type AcerolaTimelineStepProps = {
    data: {
      title: string;
      description?: string;
      icon: Component<{ class?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
    };
    ui?: { isLast?: boolean; tone?: 'neutral' | 'brand' | 'success'; className?: string };
    children: Snippet;
  };

  const ICON_TONE_CLASSES: Record<NonNullable<AcerolaTimelineStepProps['ui']>['tone'] & string, string> = {
    neutral: 'border-border bg-card text-foreground',
    brand: 'border-primary/30 bg-primary/10 text-primary',
    success: 'border-success/30 bg-success/10 text-success',
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { data, ui, children }: AcerolaTimelineStepProps = $props();
</script>

<div class={cn('flex gap-3.5', ui?.isLast ? 'pb-0' : 'pb-5', ui?.className)}>
  <div class="flex flex-col items-center">
    <span
      class={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border shadow-xs',
        ICON_TONE_CLASSES[ui?.tone ?? 'neutral'],
      )}
    >
      <data.icon class="size-4" aria-hidden="true" />
    </span>
    {#if !ui?.isLast}
      <span class="mt-1 w-px flex-1 bg-border" aria-hidden="true"></span>
    {/if}
  </div>

  <div class="min-w-0 flex-1 pt-1">
    <h3 class="text-sm font-semibold text-foreground">{data.title}</h3>
    {#if data.description}
      <p class="mt-0.5 text-xs text-muted-foreground">{data.description}</p>
    {/if}
    <div class="mt-3 flex flex-col gap-3">
      {@render children()}
    </div>
  </div>
</div>
