<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';

  /**
   * O número que se lê de relance, no alto do painel.
   *
   * Quando o cartão tem um tom (danger, info, success, brand, warning), ele ganha o fundo
   * sólido da cor correspondente sem borda (bg-rose-100, bg-sky-100, etc.) no espírito
   * dos cards de dashboard modernos do VibePrompts. Sem tom escolhido (neutral), ele
   * permanece neutro com borda padrão.
   */
  export type StatCardTone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';

  export type AcerolaStatCardProps = {
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

  /** O fundo do cartão inteiro — quando colorido, não tem borda; quando neutro, usa bg-card com borda */
  const TONE_CARD: Record<StatCardTone, string> = {
    brand: 'bg-purple-100 text-purple-950 dark:bg-purple-950 dark:text-purple-100',
    neutral: 'bg-card border-border border text-card-foreground',
    success: 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100',
    warning: 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100',
    danger: 'bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100',
    info: 'bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100',
  };

  const TONE_LABEL: Record<StatCardTone, string> = {
    brand: 'text-purple-800 dark:text-purple-300',
    neutral: 'text-ink-500',
    success: 'text-emerald-800 dark:text-emerald-300',
    warning: 'text-amber-800 dark:text-amber-300',
    danger: 'text-rose-800 dark:text-rose-300',
    info: 'text-sky-800 dark:text-sky-300',
  };

  const TONE_VALUE: Record<StatCardTone, string> = {
    brand: 'text-purple-950 dark:text-purple-50',
    neutral: 'text-ink-900',
    success: 'text-emerald-950 dark:text-emerald-50',
    warning: 'text-amber-950 dark:text-amber-50',
    danger: 'text-rose-950 dark:text-rose-50',
    info: 'text-sky-950 dark:text-sky-50',
  };

  const TONE_ICON: Record<StatCardTone, string> = {
    brand: 'bg-purple-600 text-white',
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

  let { data, ui, state }: AcerolaStatCardProps = $props();

  const tone = $derived(ui?.tone ?? 'neutral');
  const Icon = $derived(ui?.icon);
</script>

<div
  class={cn(
    /* Cartão é SUPERFÍCIE: o mesmo raio do `Card`, do diálogo e da tabela
       (`lib/theme/tokens.css`). Vinha com raio de controle e encostava visualmente nos
       botões em volta. */
    'rounded-surface py-4 pr-4 pl-5 transition-all shadow-xs',
    TONE_CARD[tone],
    ui?.className,
  )}
>
  {#if Icon}
    <div class="mb-2 flex items-center gap-2.5">
      <span class={cn('flex size-8 shrink-0 items-center justify-center rounded-chip', TONE_ICON[tone])}>
        <Icon size={15} aria-hidden="true" />
      </span>
      <p class={cn('text-[11px] font-semibold tracking-wider uppercase', TONE_LABEL[tone])}>
        {data.label}
      </p>
    </div>
  {:else}
    <p class={cn('mb-1 text-[11px] font-semibold tracking-wider uppercase', TONE_LABEL[tone])}>
      {data.label}
    </p>
  {/if}

  {#if state?.isLoading}
    <Skeleton class="mt-1 h-8 w-20" />
  {:else}
    <div class="flex flex-wrap items-baseline gap-x-2">
      <p
        class={cn(
          'font-bold tabular-nums',
          ui?.size === 'lg' ? 'text-4xl' : 'text-3xl font-semibold tracking-tight',
          TONE_VALUE[tone],
        )}
      >
        {data.value}
      </p>

      {#if data.hint}
        <p class={cn('text-xs mt-0.5', TONE_LABEL[tone])}>{data.hint}</p>
      {/if}
    </div>
  {/if}
</div>
