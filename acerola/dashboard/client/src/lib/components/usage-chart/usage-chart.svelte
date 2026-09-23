<script lang="ts" module>
  /**
   * O USO DA MÁQUINA AO LONGO DO TEMPO — processador, memória e disco na mesma escala.
   *
   * Linha, e não coluna: aqui a pergunta é "quando ficou ruim e por quanto tempo", e a
   * resposta é a FORMA da curva. Trezentas colunas de meio pixel não desenham forma nenhuma.
   *
   * As três séries dividem o mesmo eixo porque todas são porcentagem de 0 a 100 — é o que
   * deixa comparar de relance "a memória estava no talo enquanto o processador dormia".
   *
   * Função pura de props: não busca nada. Por isso abre no Storybook carregando, vazia e com
   * pico — estados que, num componente que busca sozinho, exigiriam um servidor.
   */
  export type UsagePoint = {
    /** O instante da leitura, em ISO. */
    at: string;
    cpuPercent: number;
    memoryPercent: number;
    diskPercent: number;
  };

  export type UsageChartProps = {
    data: { points: UsagePoint[] };
    state?: { isLoading?: boolean };
    ui?: { emptyLabel?: string; className?: string };
  };

  type SeriesKey = 'cpuPercent' | 'memoryPercent' | 'diskPercent';

  type Series = { key: SeriesKey; label: string; color: string };

  /* O rótulo é texto de tela (português); a chave é do contrato (inglês). */
  const SERIES: Series[] = [
    { key: 'cpuPercent', label: 'Processador', color: 'var(--chart-1)' },
    { key: 'memoryPercent', label: 'Memória', color: 'var(--chart-4)' },
    { key: 'diskPercent', label: 'Disco', color: 'var(--chart-5)' },
  ];

  const VIEW_WIDTH = 600;
  const VIEW_HEIGHT = 180;

  /**
   * A linha de uma série, em coordenadas do `viewBox`.
   *
   * Exportada para ter teste próprio: é uma conta, e uma conta errada aqui desenha um gráfico
   * bonito que mente — o pior defeito possível numa tela de diagnóstico.
   */
  export function buildLine(points: readonly UsagePoint[], key: SeriesKey): string {
    if (points.length === 0) return '';
    /* Uma leitura só não tem linha: vira um ponto no meio, para não sumir da tela. */
    if (points.length === 1) return `M0,${yOf(points[0]![key])} L${VIEW_WIDTH},${yOf(points[0]![key])}`;

    return points
      .map((point, index) => {
        const x = (index / (points.length - 1)) * VIEW_WIDTH;

        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${yOf(point[key])}`;
      })
      .join(' ');
  }

  /** 0% embaixo, 100% em cima — o SVG conta o Y ao contrário de como a pessoa lê. */
  function yOf(value: number): string {
    const clamped = Math.min(100, Math.max(0, value));

    return (VIEW_HEIGHT - (clamped / 100) * VIEW_HEIGHT).toFixed(1);
  }

  /** A hora de uma leitura, curta: o eixo quer "14h", não "23/09/2026 14:05". */
  export function hourLabel(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';

    return `${String(date.getHours()).padStart(2, '0')}h`;
  }
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { data, state, ui }: UsageChartProps = $props();

  const points = $derived(data.points);
  const lines = $derived(SERIES.map((series) => ({ ...series, d: buildLine(points, series.key) })));

  /* Quatro marcas de hora bastam: mais que isso vira uma régua ilegível em tela de celular. */
  const ticks = $derived(
    points.length < 2
      ? []
      : [0, 0.33, 0.66, 1].map((position) => ({
          x: position * VIEW_WIDTH,
          label: hourLabel(points[Math.round(position * (points.length - 1))]!.at),
        })),
  );
</script>

{#if state?.isLoading}
  <div class={cn('bg-ink-100 h-48 w-full animate-pulse rounded-lg', ui?.className)}></div>
{:else if points.length === 0}
  <p class={cn('text-ink-500 py-12 text-center text-sm', ui?.className)}>
    {ui?.emptyLabel ?? 'Sem leituras no período.'}
  </p>
{:else}
  <div class={cn('flex flex-col gap-2', ui?.className)}>
    <!-- A legenda vem SEMPRE, com o nome escrito: cor sozinha não é informação para quem não
         distingue cor (ver `chart-slice`). -->
    <ul class="flex flex-wrap gap-x-4 gap-y-1">
      {#each SERIES as series (series.key)}
        <li class="text-ink-700 flex items-center gap-1.5 text-xs">
          <span
            class="size-2.5 rounded-full"
            style="background: {series.color};"
            aria-hidden="true"
          ></span>
          {series.label}
        </li>
      {/each}
    </ul>

    <svg
      class="h-48 w-full"
      viewBox="0 0 {VIEW_WIDTH} {VIEW_HEIGHT}"
      preserveAspectRatio="none"
      role="img"
      aria-label="Uso de processador, memória e disco ao longo das últimas horas"
    >
      <!-- As três linhas de referência (25, 50, 75%) dão a altura sem precisar de eixo. -->
      {#each [25, 50, 75] as reference (reference)}
        <line
          x1="0"
          x2={VIEW_WIDTH}
          y1={yOf(reference)}
          y2={yOf(reference)}
          stroke="var(--border)"
          stroke-width="1"
          vector-effect="non-scaling-stroke"
        />
      {/each}

      {#each lines as line (line.key)}
        <path
          d={line.d}
          fill="none"
          stroke={line.color}
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
        />
      {/each}
    </svg>

    <div class="text-ink-500 flex justify-between text-[11px]">
      {#each ticks as tick (tick.x)}
        <span>{tick.label}</span>
      {/each}
    </div>
  </div>
{/if}
