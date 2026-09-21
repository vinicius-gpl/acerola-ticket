<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';

  /**
   * O número que se lê de relance, no alto do painel.
   *
   * O `tone` não é enfeite: é o que permite varrer a fileira de cartões sem ler rótulo por
   * rótulo — vermelho puxa o olho para o que está vencido. Com ícone, o quadrado sólido
   * substitui a barra lateral; as duas juntas seriam a mesma informação dita duas vezes.
   *
   * O `hint` existe para número que EXCLUI algo ("exclui 1.067 arquivados"). Sem ele, dois
   * painéis contando a mesma coisa de formas diferentes discordam, e ninguém descobre por quê.
   */
  export type StatCardTone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';

  export type StatCardProps = {
    data: {
      label: string;
      value: number | string;
      hint?: string | null;
    };
    ui?: {
      tone?: StatCardTone;
      size?: 'md' | 'lg';
      className?: string;
      icon?: LucideIcon;
    };
    state?: { isLoading?: boolean };
  };

  const TONE_BAR: Record<StatCardTone, string> = {
    brand: 'bg-brand-blue-700',
    neutral: 'bg-ink-300',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
  };

  const TONE_VALUE: Record<StatCardTone, string> = {
    brand: 'text-brand-blue-800',
    neutral: 'text-ink-900',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-rose-600',
    info: 'text-sky-600',
  };

  const TONE_ICON: Record<StatCardTone, string> = {
    brand: 'bg-brand-blue-800 text-white',
    neutral: 'bg-ink-700 text-white',
    success: 'bg-emerald-600 text-white',
    warning: 'bg-amber-600 text-white',
    danger: 'bg-rose-600 text-white',
    info: 'bg-sky-600 text-white',
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import { Skeleton } from '$lib/components/ui/skeleton';

  let { data, ui, state }: StatCardProps = $props();

  const tone = $derived(ui?.tone ?? 'neutral');
  const Icon = $derived(ui?.icon);
</script>

<div
  class={cn(
    'border-ink-300 bg-ink-100/50 relative overflow-hidden rounded-lg border py-4 pr-4 pl-5',
    ui?.className
  )}
>
  {#if Icon}
    <span
      class={cn('mb-3 flex size-9 items-center justify-center rounded-lg', TONE_ICON[tone])}
    >
      <Icon size={16} aria-hidden="true" />
    </span>
  {:else}
    <span aria-hidden="true" class={cn('absolute inset-y-0 left-0 w-1', TONE_BAR[tone])} />
  {/if}

  <p class="text-ink-500 text-[11px] font-semibold tracking-wider uppercase">
    {data.label}
  </p>

  {#if state?.isLoading}
    <Skeleton class="mt-1 h-8 w-20" />
  {:else}
    <p
      class={cn(
        'mt-0.5 font-bold tabular-nums',
        ui?.size === 'lg' ? 'text-4xl' : 'text-2xl',
        TONE_VALUE[tone]
      )}
    >
      {data.value}
    </p>
  {/if}

  {#if data.hint}
    <p class="text-ink-500 mt-1 text-[11px]">{data.hint}</p>
  {/if}
</div>
