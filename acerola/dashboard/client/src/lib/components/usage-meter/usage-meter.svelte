<script lang="ts" module>
  export type UsageMeterProps = {
    data: {
      label: string;
      percentage: number;
      /** A leitura em palavras, ao lado do rótulo: "12,4 GB de 16 GB". */
      detail?: string;
    };
    ui?: {
      className?: string;
    };
  };

  export type UsageTone = 'calm' | 'attention' | 'critical';

  const TONE_CLASSES: Record<UsageTone, string> = {
    calm: 'bg-emerald-500',
    attention: 'bg-yellow-500',
    critical: 'bg-red-500',
  };

  /**
   * A cor da barra de USO — o contrário da barra de progresso de tarefa, onde cheio é bom.
   *
   * Aqui cheio é ruim: 95% de disco é uma máquina que vai parar. Reaproveitar a barra de
   * progresso daria verde justamente no pior caso, então esta é uma peça própria.
   *
   * Os cortes são os mesmos que a régua de saúde usa (`computer-health.util`), para a barra
   * não ficar amarela numa máquina que a ficha chama de crítica.
   *
   * Exportada para ter teste próprio: um corte trocado aqui pinta de verde justamente a
   * máquina que está prestes a parar.
   */
  export function usageTone(percentage: number): UsageTone {
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'attention';

    return 'calm';
  }
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import { formatPercent } from '$lib/utils/format-machine';

  let { data, ui }: UsageMeterProps = $props();

  /* A barra nunca passa da borda nem some para a esquerda, mesmo que a medida venha torta. */
  const percentage = $derived(Math.min(100, Math.max(0, data.percentage)));
  const tone = $derived(usageTone(percentage));
</script>

<div class={cn('min-w-0', ui?.className)}>
  <div class="mb-1 flex items-baseline justify-between gap-2">
    <span class="text-ink-700 truncate text-xs">{data.label}</span>
    <span class="text-ink-900 shrink-0 text-xs font-medium tabular-nums">
      {formatPercent(percentage)}
    </span>
  </div>

  <div
    class="bg-muted h-1.5 w-full overflow-hidden rounded-full"
    role="progressbar"
    aria-label={data.label}
    aria-valuenow={Math.round(percentage)}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <div class={cn('h-full rounded-full transition-all', TONE_CLASSES[tone])} style="width: {percentage}%"></div>
  </div>

  {#if data.detail}
    <p class="text-ink-500 mt-1 truncate text-xs">{data.detail}</p>
  {/if}
</div>
