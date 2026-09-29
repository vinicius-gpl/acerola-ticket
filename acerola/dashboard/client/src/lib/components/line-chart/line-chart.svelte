<script lang="ts" module>
  import type { ChartConfig } from '$lib/utils/chart-config';
  import type { TimePoint, TimeSeriesDef } from '$lib/utils/time-series';

  /**
   * LINHA — a tendência de alguma coisa ao longo do tempo.
   *
   * Linha e não área: a área pinta VOLUME, e volume pintado em várias séries vira uma
   * mancha. Quando a pergunta é "está subindo ou descendo, e uma série cruzou a outra?",
   * o traço fino responde e a mancha atrapalha.
   *
   * O ponto em cada leitura é de propósito: sem ele, uma série de dois dias vira um risco
   * que não se sabe onde começa.
   */
  export type LineChartProps = {
    data: { points: readonly TimePoint[]; series: readonly TimeSeriesDef[] };
    state?: { isLoading?: boolean };
    ui?: {
      emptyLabel?: string;
      className?: string;
      /** A régua do eixo do tempo. @default 'day' */
      tick?: 'hour' | 'day';
      /** Trava a escala em 0–100 — para quando o dado É porcentagem. */
      isPercent?: boolean;
      /** A altura da caixa de desenho. @default 'h-48' */
      heightClass?: string;
    };
  };

  /** O contrato de cores e rótulos que a moldura e o balão leem. */
  export function configOf(series: readonly TimeSeriesDef[]): ChartConfig {
    return Object.fromEntries(
      series.map((item) => [item.key, { label: item.label, color: item.color }]),
    );
  }
</script>

<script lang="ts">
  import { LineChart as LayerLineChart } from 'layerchart';

  import ChartLegend from '$lib/components/chart-legend/chart-legend.svelte';
  import ChartFrame from '$lib/components/chart-frame/chart-frame.svelte';
  import ChartTooltip from '$lib/components/chart-tooltip/chart-tooltip.svelte';
  import { cn } from '$lib/utils/cn';
  import { dayLabel, hourLabel, toTimeRows } from '$lib/utils/time-series';

  let { data, state: chartState, ui }: LineChartProps = $props();

  const rows = $derived(toTimeRows(data.points, data.series));
  const chartConfig = $derived(configOf(data.series));
  const formatTick = $derived(ui?.tick === 'hour' ? hourLabel : dayLabel);
  const keys = $derived(data.series.map((item) => item.key));
</script>

{#if chartState?.isLoading}
  <div class={cn('bg-muted w-full animate-pulse rounded-lg', ui?.heightClass ?? 'h-48')}></div>
{:else if rows.length === 0}
  <p class={cn('text-muted-foreground py-12 text-center text-sm', ui?.className)}>
    {ui?.emptyLabel ?? 'Sem leituras no período.'}
  </p>
{:else}
  <div class={cn('flex flex-col gap-2', ui?.className)}>
    <ChartLegend data={{ series: data.series }} />

    <div class={cn('w-full', ui?.heightClass ?? 'h-48')}>
      <ChartFrame data={{ config: chartConfig }} ui={{ className: 'h-full w-full' }}>
        <LayerLineChart
          data={rows}
          x="at"
          y={keys}
          yDomain={ui?.isPercent ? [0, 100] : undefined}
          series={data.series.map((item) => ({
            key: item.key,
            label: item.label,
            value: item.key,
            color: item.color,
          }))}
          axis="x"
          rule={false}
          points={rows.length <= 14}
          padding={{ bottom: 22, left: 4, right: 4, top: 8 }}
          props={{
            spline: { class: 'stroke-2', motion: 'tween' },
            grid: { y: true, x: false },
            xAxis: { format: formatTick, ticks: 4 },
          }}
        >
          {#snippet tooltip()}
            <ChartTooltip actions={{ onFormatLabel: (value) => formatTick(value as Date) }} />
          {/snippet}
        </LayerLineChart>
      </ChartFrame>
    </div>
  </div>
{/if}
