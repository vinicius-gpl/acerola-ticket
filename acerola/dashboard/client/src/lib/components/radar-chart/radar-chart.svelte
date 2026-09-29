<script lang="ts" module>
  import type { ChartConfig } from '$lib/utils/chart-config';
  import type { ChartSlice } from '$lib/utils/chart-slice';

  /**
   * RADAR — o PERFIL de um conjunto de categorias, de uma vez só.
   *
   * É o gráfico para "em que este parque dá problema", e não para "qual dá mais". A rosca
   * responderia a mesma pergunta em teoria, mas com nove ou dez categorias ela vira um anel
   * de fatias finas que só se lê pela legenda ao lado — e aí quem está lendo a legenda não
   * está olhando o desenho. O radar escreve o nome de cada categoria NO PRÓPRIO eixo: não há
   * legenda para consultar, e a forma da teia é reconhecível de longe.
   *
   * Onde ele NÃO serve, e por isso não é o gráfico padrão de nada:
   *
   *  - **Poucas categorias.** Com três eixos o radar vira um triângulo que não diz nada; a
   *    barra diz.
   *  - **Muitas categorias.** Passando de umas doze, os nomes em volta se encavalam.
   *  - **Ordenar.** "Quem é o maior" se lê em barra, na hora; num radar é preciso comparar
   *    distâncias até o centro.
   *
   * O valor de cada ponta continua no balão, ao passar o ponteiro, e na lista para leitor de
   * tela: a forma mostra o perfil, mas o número exato ninguém mede a olho num radar.
   */
  export type RadarChartProps = {
    data: {
      slices: ChartSlice[];
      /** O nome da série no balão — "Chamados: 8". */
      seriesLabel: string;
    };
    state?: { isLoading?: boolean };
    ui?: {
      emptyLabel?: string;
      className?: string;
      /** A cor da teia. @default 'var(--chart-1)' */
      color?: string;
      /** A altura da caixa de desenho. @default 'h-72' */
      heightClass?: string;
    };
    actions?: { onSelect?: (label: string) => void };
  };

  const VALUE_KEY = 'value';

  /**
   * Quantas categorias o radar comporta antes de os nomes se encavalarem em volta.
   *
   * Exportado para quem monta a tela poder decidir ANTES de desenhar: passando disso, o
   * gráfico certo é a barra deitada.
   */
  export const RADAR_MAX_SLICES = 12;

  /** Nome longo cortado no eixo; o nome inteiro continua no balão e na lista. */
  export function shortenAxis(label: string, max = 16): string {
    if (label.length <= max) return label;

    return `${label.slice(0, max - 1).trimEnd()}…`;
  }

  /** O contrato de cores e rótulos que a moldura e o balão leem. */
  export function configOf(seriesLabel: string, color: string): ChartConfig {
    return { [VALUE_KEY]: { label: seriesLabel, color } };
  }
</script>

<script lang="ts">
  import { AreaChart } from 'layerchart';

  import ChartFrame from '$lib/components/chart-frame/chart-frame.svelte';
  import ChartTooltip from '$lib/components/chart-tooltip/chart-tooltip.svelte';
  import { cn } from '$lib/utils/cn';

  /* O prop precisa de outro nome aqui dentro: um binding local chamado `state` faz o
     compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune. */
  let { data, state: chartState, ui, actions }: RadarChartProps = $props();

  const color = $derived(ui?.color ?? 'var(--chart-1)');
  const chartConfig = $derived(configOf(data.seriesLabel, color));
</script>

{#if chartState?.isLoading}
  <div
    class={cn('bg-muted w-full animate-pulse rounded-lg', ui?.heightClass ?? 'h-72', ui?.className)}
  ></div>
{:else if data.slices.length === 0}
  <p
    class={cn(
      'text-muted-foreground flex items-center justify-center text-center text-xs',
      ui?.heightClass ?? 'h-72',
      ui?.className,
    )}
  >
    {ui?.emptyLabel ?? 'Sem dados para mostrar'}
  </p>
{:else}
  <div class={cn('flex w-full flex-col', ui?.className)}>
    <!-- `role="img"` some com o conteúdo para o leitor de tela — é o que se quer de um
         desenho. Por isso a lista abaixo fica FORA desta caixa, e não dentro dela. -->
    <div class={cn('w-full', ui?.heightClass ?? 'h-72')} role="img" aria-label={data.seriesLabel}>
      <ChartFrame data={{ config: chartConfig }} ui={{ className: 'h-full w-full' }}>
        <AreaChart
          data={data.slices}
          x="label"
          y={VALUE_KEY}
          radial
          series={[
            { key: VALUE_KEY, label: data.seriesLabel, value: VALUE_KEY, color: 'var(--color-value)' },
          ]}
          axis="x"
          rule={false}
          grid={{ xTicks: data.slices.length, radialY: 'circle' }}
          points
          padding={{ top: 28, bottom: 28, left: 28, right: 28 }}
          props={{
            area: { fillOpacity: 0.32, line: { class: 'stroke-2' }, motion: 'tween' },
            points: { r: 3 },
            xAxis: { format: (value: unknown) => shortenAxis(String(value)) },
          }}
        >
          {#snippet tooltip()}
            <ChartTooltip />
          {/snippet}
        </AreaChart>
      </ChartFrame>
    </div>

    <!-- O MESMO conteúdo do desenho, em texto: num radar ninguém mede o valor exato a olho,
         e quem usa leitor de tela ou só o teclado não tem desenho nenhum para olhar. -->
    <ul class="sr-only">
      <!-- A chave leva a POSIÇÃO junto com o rótulo: dois itens podem ter o mesmo nome, e
           chave repetida num `each` derruba a tela inteira em vez de só desenhar torto. -->
      {#each data.slices as slice, index (`${slice.label}-${index}`)}
        <li>
          {#if actions?.onSelect}
            <button
              type="button"
              aria-label="{slice.label}: {slice.value}"
              onclick={() => actions?.onSelect?.(slice.label)}
            >
              {slice.label}: {slice.value}
            </button>
          {:else}
            <span aria-label="{slice.label}: {slice.value}">{slice.label}: {slice.value}</span>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}
