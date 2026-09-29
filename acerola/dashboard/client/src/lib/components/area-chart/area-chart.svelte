<script lang="ts" module>
  import type { ChartConfig } from '$lib/utils/chart-config';
  import type { TimePoint, TimeSeriesDef } from '$lib/utils/time-series';

  /**
   * ÁREA — o volume de alguma coisa ao longo do tempo.
   *
   * Área, e não barra: aqui a pergunta é "quando subiu e por quanto tempo ficou lá", e a
   * resposta é a FORMA da curva. Trinta barras de meio pixel não desenham forma nenhuma.
   *
   * Duas formas de empilhar, e a escolha muda o que o gráfico responde:
   *
   *  - **`overlap`** (o padrão): as séries se sobrepõem, cada uma lida na própria altura. É o
   *    que se quer quando elas são a MESMA medida em coisas diferentes — processador, memória
   *    e disco, todos de 0 a 100%. Empilhar daria 240% de nada.
   *  - **`stack`**: uma em cima da outra, e a altura total é a soma. É o que se quer quando
   *    elas são PARTES de um todo — quantos chamados de cada tipo entraram no dia.
   */
  export type AreaChartProps = {
    data: { points: readonly TimePoint[]; series: readonly TimeSeriesDef[] };
    state?: { isLoading?: boolean };
    ui?: {
      emptyLabel?: string;
      className?: string;
      /** @default 'overlap' */
      layout?: 'overlap' | 'stack';
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
  import { AreaChart as LayerAreaChart } from 'layerchart';

  import ChartLegend from '$lib/components/chart-legend/chart-legend.svelte';
  import ChartFrame from '$lib/components/chart-frame/chart-frame.svelte';
  import ChartTooltip from '$lib/components/chart-tooltip/chart-tooltip.svelte';
  import { cn } from '$lib/utils/cn';
  import { dayLabel, hourLabel, toTimeRows } from '$lib/utils/time-series';

  let { data, state: chartState, ui }: AreaChartProps = $props();

  const rows = $derived(toTimeRows(data.points, data.series));
  const chartConfig = $derived(configOf(data.series));
  const formatTick = $derived(ui?.tick === 'hour' ? hourLabel : dayLabel);
  const keys = $derived(data.series.map((item) => item.key));

  /**
   * FOLGA EM CIMA, e mais folga ainda quando o dado é porcentagem.
   *
   * Numa escala travada em 0–100, uma leitura de 100% cai exatamente na borda de cima do
   * desenho. Com pouca folga, o traço encosta no limite do quadro e o pico sai ACHATADO
   * contra a borda: quem olha não distingue "bateu no teto" de "o gráfico foi cortado".
   */
  const padding = $derived({
    bottom: 22,
    left: 4,
    right: 4,
    top: ui?.isPercent ? 18 : 10,
  });
</script>

{#if chartState?.isLoading}
  <div class={cn('bg-muted w-full animate-pulse rounded-box', ui?.heightClass ?? 'h-48')}></div>
{:else if rows.length === 0}
  <p class={cn('text-muted-foreground py-12 text-center text-sm', ui?.className)}>
    {ui?.emptyLabel ?? 'Sem leituras no período.'}
  </p>
{:else}
  <div class={cn('flex flex-col gap-2', ui?.className)}>
    <ChartLegend data={{ series: data.series }} />

    <div class={cn('w-full', ui?.heightClass ?? 'h-48')}>
      <ChartFrame data={{ config: chartConfig }} ui={{ className: 'h-full w-full' }}>
        <LayerAreaChart
          data={rows}
          x="at"
          y={keys}
          yDomain={ui?.isPercent ? [0, 100] : undefined}
          seriesLayout={ui?.layout ?? 'overlap'}
          series={data.series.map((item) => ({
            key: item.key,
            label: item.label,
            value: item.key,
            color: item.color,
          }))}
          axis="x"
          rule={false}
          {padding}
          props={{
            area: { fillOpacity: 0.18, line: { class: 'stroke-2' }, motion: 'tween' },
            grid: { y: true, x: false },
            xAxis: { format: formatTick, ticks: 4 },
          }}
        >
          {#snippet tooltip()}
            <ChartTooltip actions={{ onFormatLabel: (value) => formatTick(value as Date) }} />
          {/snippet}
        </LayerAreaChart>
      </ChartFrame>
    </div>
  </div>
{/if}
