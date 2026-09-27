<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';

  /**
   * O número que se lê de relance, no alto do painel.
   *
   * O cartão em si é NEUTRO — quem carrega a cor é o quadrado do ícone. Pintar o cartão
   * inteiro de uma cor suave parecia mais "colorido" à primeira vista, mas numa fileira de
   * vários cartões o efeito é o oposto: tudo compete por atenção ao mesmo tempo, e o olho não
   * acha o que importa mais rápido do que achava sem cor nenhuma.
   *
   * Sem ícone (a maioria dos cartões deste sistema ainda não tem um), o número grande é que
   * carrega o tom — é o que sobra pra fazer o "vermelho puxa o olho" continuar funcionando.
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

  /** O quadrado do ícone — sólido, sem opacidade, é o principal carregador de cor do cartão. */
  const TONE_ICON: Record<StatCardTone, string> = {
    brand: 'bg-primary text-primary-foreground',
    neutral: 'bg-ink-700 text-white',
    success: 'bg-emerald-600 text-white',
    warning: 'bg-amber-600 text-white',
    danger: 'bg-rose-600 text-white',
    info: 'bg-sky-600 text-white',
  };

  /** Texto colorido sobre o cartão neutro — para a variação ao lado do número, e para o
   * número em si nos cartões sem ícone (onde ninguém mais carrega a cor). */
  const TONE_TEXT: Record<StatCardTone, string> = {
    brand: 'text-primary',
    neutral: 'text-ink-900',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-rose-600 dark:text-rose-400',
    info: 'text-sky-600 dark:text-sky-400',
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import { Skeleton } from '$lib/components/ui/skeleton';

  let { data, ui, state }: StatCardProps = $props();

  const tone = $derived(ui?.tone ?? 'neutral');
  const Icon = $derived(ui?.icon);
  /* Com ícone, ELE carrega a cor e o número fica neutro — a mesma régua de qualquer painel de
     métricas: só um elemento grita de cada vez. Sem ícone, o número é o que sobra. */
  const valueTone = $derived(Icon ? 'neutral' : tone);
</script>

<div class={cn('bg-card border-border rounded-lg border py-4 pr-4 pl-5', ui?.className)}>
  {#if Icon}
    <div class="mb-2 flex items-center gap-2.5">
      <span class={cn('flex size-8 shrink-0 items-center justify-center rounded-md', TONE_ICON[tone])}>
        <Icon size={15} aria-hidden="true" />
      </span>
      <p class="text-ink-500 text-[11px] font-semibold tracking-wider uppercase">
        {data.label}
      </p>
    </div>
  {:else}
    <p class="text-ink-500 mb-0.5 text-[11px] font-semibold tracking-wider uppercase">
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
          ui?.size === 'lg' ? 'text-4xl' : 'text-2xl',
          TONE_TEXT[valueTone],
        )}
      >
        {data.value}
      </p>

      {#if data.hint}
        <!-- O hint é uma RESSALVA ("exclui arquivados"), não uma tendência — colorir feito
             o número faria parecer bom/ruim algo que só está explicando uma exclusão. -->
        <p class="text-ink-500 text-xs">{data.hint}</p>
      {/if}
    </div>
  {/if}
</div>
