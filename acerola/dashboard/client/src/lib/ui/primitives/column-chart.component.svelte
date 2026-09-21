<script lang="ts" module>
  import type { ChartSlice } from '$lib/utils/chart-slice.util';

  /**
   * Coluna — para comparar quantidades entre categorias (por responsável, por tipo).
   *
   * **Sem legenda** (uma série só; legenda de uma série é ruído), **o valor escrito acima de
   * cada coluna** (no lugar de obrigar a estimar pela altura) e **clique na coluna abrindo o
   * detalhamento**. Sem eixo Y: com o número em cima de cada coluna, a escala à esquerda não
   * acrescenta nada e come largura.
   */
  export type ColumnChartProps = {
    data: {
      slices: ChartSlice[];
      /** O nome da série no popover — "Tarefas: 8". Mesmo motivo da rosca. */
      seriesLabel: string;
    };
    state?: { isLoading?: boolean };
    ui?: { emptyLabel?: string };
    actions?: { onSelect?: (label: string) => void };
  };

  /** Rótulo longo cortado no eixo; o nome inteiro continua no tooltip. */
  function shorten(label: string): string {
    return label.length > 14 ? `${label.slice(0, 13)}…` : label;
  }

  const PADDING = { top: 36, right: 14, left: 14, bottom: 64 };
  const BAR_RADIUS = 4;
</script>

<script lang="ts">
  import { colorOfSlice } from '$lib/utils/chart-slice.util';

  /* O prop precisa de outro nome aqui dentro: um binding local chamado `state` faz o
     compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune. */
  let { data, state: chartState, ui, actions }: ColumnChartProps = $props();

  // Tooltip state
  let tooltipSlice: ChartSlice | null = $state(null);
  let tooltipX = $state(0);
  let tooltipY = $state(0);

  let svgWidth = $state(0);
  let svgHeight = $state(0);

  const chartW = $derived(Math.max(1, svgWidth - PADDING.left - PADDING.right));
  const chartH = $derived(Math.max(1, svgHeight - PADDING.top - PADDING.bottom));

  const maxValue = $derived(Math.max(...data.slices.map((s) => s.value), 1));
  const barWidth = $derived(Math.max(4, chartW / Math.max(data.slices.length, 1) - 8));

  type BarInfo = {
    slice: ChartSlice;
    color: string;
    x: number;
    barY: number;
    barH: number;
    cx: number;
  };

  const bars = $derived<BarInfo[]>(
    data.slices.map((slice, i) => {
      const slotW = chartW / data.slices.length;
      const cx = PADDING.left + slotW * i + slotW / 2;
      const barH = Math.max(2, (slice.value / maxValue) * chartH);
      const barY = PADDING.top + chartH - barH;
      const color = colorOfSlice(slice.label, i);
      return { slice, color, x: cx - barWidth / 2, barY, barH, cx };
    }),
  );

  // pill width: min 20px, based on text length
  function pillWidth(text: string): number {
    return Math.max(20, text.length * 6.5 + 12);
  }

  function handleBarClick(slice: ChartSlice) {
    actions?.onSelect?.(slice.label);
  }
</script>

<svelte:options runes={true} />

{#if chartState?.isLoading}
  <div class="h-full w-full animate-pulse rounded-lg bg-slate-100"></div>
{:else if data.slices.length === 0}
  <p class="flex h-full items-center justify-center text-xs text-slate-400">
    {ui?.emptyLabel ?? 'Sem dados para mostrar'}
  </p>
{:else}
  <div class="relative h-full w-full">
    <svg
      bind:clientWidth={svgWidth}
      bind:clientHeight={svgHeight}
      class="h-full w-full overflow-visible"
      aria-label={data.seriesLabel}
      role="img"
    >
      {#each bars as bar (bar.slice.label)}
        {@const text = String(bar.slice.value)}
        {@const pw = pillWidth(text)}
        <!-- Bar column -->
        <g
          role={actions?.onSelect ? 'button' : undefined}
          tabindex={actions?.onSelect ? 0 : undefined}
          aria-label="{bar.slice.label}: {bar.slice.value}"
          style="cursor: {actions?.onSelect ? 'pointer' : 'default'}"
          onclick={() => handleBarClick(bar.slice)}
          onkeydown={(e) => e.key === 'Enter' && handleBarClick(bar.slice)}
          onmouseenter={(e) => {
            tooltipSlice = bar.slice;
            tooltipX = e.clientX;
            tooltipY = e.clientY;
          }}
          onmouseleave={() => (tooltipSlice = null)}
        >
          <rect
            x={bar.x}
            y={bar.barY}
            width={barWidth}
            height={bar.barH}
            rx={BAR_RADIUS}
            ry={BAR_RADIUS}
            fill={bar.color}
          />

          <!-- Value badge above bar -->
          <g class="pointer-events-none">
            <rect
              x={bar.cx - pw / 2}
              y={bar.barY - 20}
              width={pw}
              height={16}
              rx={8}
              fill={bar.color}
            />
            <text
              x={bar.cx}
              y={bar.barY - 12}
              text-anchor="middle"
              dominant-baseline="middle"
              class="fill-white text-[10px] font-semibold"
              font-size="10"
              font-weight="600"
              fill="white"
            >
              {text}
            </text>
          </g>

          <!-- X-axis label -->
          <text
            x={bar.cx}
            y={PADDING.top + chartH + 18}
            text-anchor="end"
            transform="rotate(-30, {bar.cx}, {PADDING.top + chartH + 18})"
            class="fill-slate-500 text-[11px]"
            font-size="11"
            fill="#64748b"
          >
            {shorten(bar.slice.label)}
          </text>
        </g>
      {/each}
    </svg>

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
