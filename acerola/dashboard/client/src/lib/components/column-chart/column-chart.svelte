<script lang="ts" module>
  import type { ChartConfig } from '$lib/utils/chart-config';
  import type { ChartSlice } from '$lib/utils/chart-slice';

  /**
   * Barra — para comparar quantidades entre categorias (por tipo, por pessoa, por máquina).
   *
   * O desenho vem do LayerChart (o mesmo gráfico do shadcn-svelte) em vez de SVG escrito à mão: é ele
   * que dá eixo que se ajusta ao dado, barra que cresce animada e balão de valor que segue o
   * ponteiro. O que este componente acrescenta é o que o projeto exige e a biblioteca não tem:
   *
   *  1. **Cor por categoria** (`chart-slice`), a mesma em todo gráfico do sistema.
   *  2. **O valor escrito em cada barra**, no lugar de obrigar a estimar pela altura.
   *  3. **Uma lista só para leitor de tela e teclado** — o desenho é SVG, e SVG não se
   *     tabula nem se lê. É por ela que a pessoa que não usa o mouse chega ao detalhamento.
   *  4. **Deitado** (`orientation: 'horizontal'`) quando o rótulo é nome de gente ou de
   *     máquina: em pé, nome longo vira leque ilegível — mais ainda na tela do celular.
   */
  export type ColumnChartProps = {
    data: {
      slices: ChartSlice[];
      /** O nome da série no balão — "Chamados: 8". Mesmo motivo da rosca. */
      seriesLabel: string;
    };
    state?: { isLoading?: boolean };
    ui?: {
      emptyLabel?: string;
      /** @default 'vertical' */
      orientation?: 'vertical' | 'horizontal';
      className?: string;
    };
    actions?: { onSelect?: (label: string) => void };
  };

  /** A chave da série no contrato do gráfico. Inglês: ninguém vê. */
  const VALUE_KEY = 'value';

  /**
   * Rótulo longo cortado NO EIXO — o nome inteiro continua no balão e na lista.
   *
   * Exportada para ter teste próprio: cortar no lugar errado é como "CONTABIL-01" e
   * "CONTABIL-02" viram duas barras com o mesmo nome na tela.
   */
  export function shorten(label: string, max = 14): string {
    if (label.length <= max) return label;

    /* `trimEnd`: cortar bem no espaço deixaria "Departamento …", com um buraco antes das
       reticências que parece erro de digitação. */
    return `${label.slice(0, max - 1).trimEnd()}…`;
  }

  /** O contrato de cores e rótulos que a moldura e o balão leem. */
  export function configOf(seriesLabel: string): ChartConfig {
    return { [VALUE_KEY]: { label: seriesLabel } };
  }
</script>

<script lang="ts">
  import { BarChart } from 'layerchart';

  import ChartFrame from '$lib/components/chart-frame/chart-frame.svelte';
  import ChartTooltip from '$lib/components/chart-tooltip/chart-tooltip.svelte';
  import { colorOfSlice } from '$lib/utils/chart-slice';
  import { cn } from '$lib/utils/cn';

  /* O prop precisa de outro nome aqui dentro: um binding local chamado `state` faz o
     compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune. */
  let { data, state: chartState, ui, actions }: ColumnChartProps = $props();

  const isHorizontal = $derived(ui?.orientation === 'horizontal');
  const chartConfig = $derived(configOf(data.seriesLabel));
  const colors = $derived(data.slices.map((slice, index) => colorOfSlice(slice.label, index)));

  /* Deitado, o eixo dos nomes precisa de largura fixa; em pé, de altura para o rótulo virado.
     Sem essa folga o texto do eixo sai cortado pela borda do cartão. */
  const padding = $derived(
    isHorizontal ? { left: 96, right: 28 } : { bottom: 44, top: 20, left: 8, right: 8 },
  );
</script>

{#if chartState?.isLoading}
  <div class="bg-muted h-full w-full animate-pulse rounded-lg"></div>
{:else if data.slices.length === 0}
  <p class="text-muted-foreground flex h-full items-center justify-center text-xs">
    {ui?.emptyLabel ?? 'Sem dados para mostrar'}
  </p>
{:else}
  <div class={cn('flex h-full w-full flex-col', ui?.className)}>
    <!-- `role="img"` some com o conteúdo para o leitor de tela — é o que se quer de um
         desenho. Por isso a lista abaixo fica FORA desta caixa, e não dentro dela. -->
    <div class="min-h-0 flex-1" role="img" aria-label={data.seriesLabel}>
      <ChartFrame data={{ config: chartConfig }} ui={{ className: 'h-full w-full' }}>
        <BarChart
          data={data.slices}
          x={isHorizontal ? VALUE_KEY : 'label'}
          y={isHorizontal ? 'label' : VALUE_KEY}
          orientation={isHorizontal ? 'horizontal' : 'vertical'}
          seriesLayout="overlap"
          series={[{ key: VALUE_KEY, label: data.seriesLabel, value: VALUE_KEY }]}
          c="label"
          cRange={colors}
          axis={isHorizontal ? 'y' : 'x'}
          grid={false}
          rule={false}
          {padding}
          labels={{ placement: 'outside', format: (value: number) => String(value) }}
          onBarClick={(_event, detail) => actions?.onSelect?.((detail.data as ChartSlice).label)}
          props={{
            bars: { radius: 4, rounded: 'edge', strokeWidth: 0 },
            xAxis: { format: (value: unknown) => (isHorizontal ? String(value) : shorten(String(value))) },
            yAxis: { format: (value: unknown) => (isHorizontal ? shorten(String(value)) : String(value)) },
            labels: { class: 'fill-foreground text-[11px] font-semibold' },
            highlight: { area: { fill: 'var(--muted)', fillOpacity: 0.5 } },
          }}
        >
          {#snippet tooltip()}
            <ChartTooltip />
          {/snippet}
        </BarChart>
      </ChartFrame>
    </div>

    <!-- O MESMO conteúdo do desenho, em texto: é por aqui que quem usa leitor de tela ou só o
         teclado lê os números e chega ao detalhamento. Fica escondido dos olhos porque para
         quem enxerga o gráfico já diz tudo isso. -->
    <ul class="sr-only">
      {#each data.slices as slice (slice.label)}
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
