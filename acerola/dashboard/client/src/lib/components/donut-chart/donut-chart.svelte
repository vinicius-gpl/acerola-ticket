<script lang="ts" module>
  import { cn } from '$lib/utils/cn';
  import type { ChartSlice } from '$lib/utils/chart-slice';

  /**
   * Rosca — para mostrar como um todo se divide (situação, categoria, cidade).
   *
   * Três coisas fazem o gráfico ser USADO e não só olhado:
   *
   *  1. **Legenda ao lado, com o nome escrito** — com o valor e a porcentagem junto.
   *  2. **O valor desenhado dentro da fatia**, com a porcentagem, e só quando a fatia passa de
   *     5% — abaixo disso o número não caberia e viraria borrão sobre a borda.
   *  3. **Clique na fatia abre o detalhamento** (`actions.onSelect`). O gráfico é o caminho para
   *     a lista, não um enfeite: é assim que alguém sai de "42 em andamento" para "quais 42".
   *
   * O total no MEIO do anel poupa a soma de cabeça.
   */
  export type DonutChartProps = {
    data: {
      slices: ChartSlice[];
      /**
       * O nome da SÉRIE, que aparece dentro do popover: "Status: 10", e embaixo do total no
       * meio do anel.
       */
      seriesLabel: string;
    };
    state?: { isLoading?: boolean };
    ui?: { emptyLabel?: string };
    actions?: { onSelect?: (label: string) => void };
  };

  /** Abaixo disso o rótulo não cabe na fatia. */
  const MIN_LABEL_PERCENT = 0.05;

  type ArcSegment = {
    slice: ChartSlice;
    color: string;
    percent: number;
    d: string;
    labelX: number;
    labelY: number;
  };

  /**
   * Calcula os arcos SVG para o donut chart.
   * innerR e outerR em fração do viewBox radius (50).
   */
  function buildArcs(slices: ChartSlice[], colors: string[]): ArcSegment[] {
    const total = slices.reduce((s, sl) => s + sl.value, 0);
    if (total === 0) return [];

    const cx = 50;
    const cy = 50;
    const outerR = 50;
    const innerR = 31; // 62% of 50
    const gap = 0.5; // degrees gap between slices

    let angle = -90; // start at top
    const segments: ArcSegment[] = [];

    for (let i = 0; i < slices.length; i++) {
      const slice = slices[i];
      const color = colors[i];
      if (!slice || color === undefined) continue;

      const percent = slice.value / total;
      const sweep = percent * 360 - gap;

      const startRad = (angle * Math.PI) / 180;
      const endRad = ((angle + sweep) * Math.PI) / 180;

      const x1 = cx + outerR * Math.cos(startRad);
      const y1 = cy + outerR * Math.sin(startRad);
      const x2 = cx + outerR * Math.cos(endRad);
      const y2 = cy + outerR * Math.sin(endRad);
      const x3 = cx + innerR * Math.cos(endRad);
      const y3 = cy + innerR * Math.sin(endRad);
      const x4 = cx + innerR * Math.cos(startRad);
      const y4 = cy + innerR * Math.sin(startRad);

      const largeArc = sweep > 180 ? 1 : 0;

      const d = [
        `M ${x1} ${y1}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
        'Z',
      ].join(' ');

      const midAngle = angle + sweep / 2;
      const midRad = (midAngle * Math.PI) / 180;
      const midR = innerR + (outerR - innerR) / 2;
      const labelX = cx + midR * Math.cos(midRad);
      const labelY = cy + midR * Math.sin(midRad);

      segments.push({ slice, color, percent, d, labelX, labelY });
      angle += sweep + gap;
    }

    return segments;
  }
</script>

<script lang="ts">
  import { colorOfSlice } from '$lib/utils/chart-slice';

  /* O prop precisa de outro nome aqui dentro: um binding local chamado `state` faz o
     compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune. */
  let { data, state: chartState, ui, actions }: DonutChartProps = $props();

  let tooltipSlice: ChartSlice | null = $state(null);
  let tooltipX = $state(0);
  let tooltipY = $state(0);

  const total = $derived(data.slices.reduce((s, sl) => s + sl.value, 0));
  const colors = $derived(data.slices.map((sl, i) => colorOfSlice(sl.label, i)));
  const arcs = $derived(buildArcs(data.slices, colors));
</script>

{#if chartState?.isLoading}
  <div class="bg-muted h-full w-full animate-pulse rounded-lg"></div>
{:else if data.slices.length === 0}
  <p class="text-muted-foreground flex h-full items-center justify-center text-xs">
    {ui?.emptyLabel ?? 'Sem dados para mostrar'}
  </p>
{:else}
  <div class="flex h-full items-center gap-4">
    <!-- Quadrado próprio para a rosca: sem ele, a legenda ao lado empurra o centro do
         anel para fora do meio visual do cartão, e o total sobreposto fica desalinhado. -->
    <div class="relative aspect-square h-full shrink-0">
      <svg viewBox="0 0 100 100" class="h-full w-full" aria-label={data.seriesLabel} role="img">
        {#each arcs as arc (arc.slice.label)}
          <path
            d={arc.d}
            fill={arc.color}
            stroke="white"
            stroke-width="0.5"
            style="cursor: {actions?.onSelect ? 'pointer' : 'default'}"
            role={actions?.onSelect ? 'button' : undefined}
            aria-label="{arc.slice.label}: {arc.slice.value}"
            onclick={() => actions?.onSelect?.(arc.slice.label)}
            onkeydown={(e) => e.key === 'Enter' && actions?.onSelect?.(arc.slice.label)}
            onmouseenter={(e) => {
              tooltipSlice = arc.slice;
              tooltipX = e.clientX;
              tooltipY = e.clientY;
            }}
            onmouseleave={() => (tooltipSlice = null)}
          />

          <!-- Label inside slice: value + percent, only when slice >= 5% -->
          {#if arc.percent >= MIN_LABEL_PERCENT}
            <text
              x={arc.labelX}
              y={arc.labelY}
              text-anchor="middle"
              dominant-baseline="middle"
              class="pointer-events-none"
              font-size="5"
              font-weight="600"
              fill="white"
              stroke="rgba(0,0,0,0.25)"
              stroke-width="0.8"
              paint-order="stroke"
            >
              {arc.slice.value} ({Math.round(arc.percent * 100)}%)
            </text>
          {/if}
        {/each}
      </svg>

      <!-- Total no meio do anel -->
      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-foreground text-xl leading-tight font-bold">
          {total.toLocaleString('pt-BR')}
        </span>
        <span class="text-muted-foreground text-[10px] tracking-wide uppercase">
          {data.seriesLabel}
        </span>
      </div>
    </div>

    <!-- `self-stretch`: sem isso a lista fica `items-center` do pai, que dá a ela só a
         própria altura de conteúdo — e com 13 status o `overflow-y-auto` nunca entra em
         ação, e a lista extravasa o cartão por baixo. -->
    <ul class="min-w-0 flex-1 space-y-2.5 self-stretch overflow-y-auto pr-1">
      {#each data.slices as slice, i (slice.label)}
        {@const color = colors[i]}
        {@const percent = total > 0 ? Math.round((slice.value / total) * 100) : 0}
        <li>
          <button
            type="button"
            onclick={() => actions?.onSelect?.(slice.label)}
            class={cn(
              'flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-xs',
              actions?.onSelect ? 'hover:bg-muted' : undefined,
            )}
          >
            <span
              class="size-2 shrink-0 rounded-[2px]"
              style="background-color: {color}"
              aria-hidden="true"
            ></span>
            <span class="text-muted-foreground w-20 shrink-0 truncate" title={slice.label}>
              {slice.label}
            </span>
            <!-- Barrinha de progresso — não é `ProgressBar` (esse componente é pra "quanto
                 já foi cumprido de uma obrigação"). Aqui a cor tem que ser a mesma do ponto e
                 da fatia — a identidade da categoria, não uma leitura de "isso está bom ou ruim". -->
            <span class="bg-muted h-1.5 min-w-8 flex-1 overflow-hidden rounded-full">
              <span
                class="block h-full rounded-full"
                style="width: {percent}%; background-color: {color}"
              ></span>
            </span>
            <span class="text-foreground shrink-0 font-semibold">{slice.value}</span>
            <span class="text-muted-foreground w-9 shrink-0 text-right">{percent}%</span>
          </button>
        </li>
      {/each}
    </ul>

    <!-- Tooltip -->
    {#if tooltipSlice}
      <div
        class="bg-card pointer-events-none fixed z-50 rounded-xl px-3 py-2.5 text-xs shadow-lg ring-1 ring-black/5"
        style="left: {tooltipX + 12}px; top: {tooltipY - 8}px;"
      >
        <p class="font-semibold">{tooltipSlice.label}</p>
        <p class="text-muted-foreground">{data.seriesLabel}: {tooltipSlice.value}</p>
      </div>
    {/if}
  </div>
{/if}
