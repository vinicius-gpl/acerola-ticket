<script lang="ts" module>
  import type { TimeSeriesDef } from '$lib/utils/time-series';

  /**
   * A LEGENDA de um gráfico de várias séries — o nome ESCRITO ao lado da cor.
   *
   * É HTML nosso, e não a legenda da biblioteca, por dois motivos: ela aparece antes de o
   * desenho se medir (então a tela nunca nasce com um gráfico sem explicação), e o projeto
   * exige que a cor nunca seja o único jeito de saber qual série é qual — ver `chart-slice`.
   */
  export type AcerolaChartLegendProps = {
    data: { series: readonly TimeSeriesDef[] };
    ui?: { className?: string };
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { data, ui }: AcerolaChartLegendProps = $props();
</script>

<ul class={cn('flex flex-wrap gap-x-4 gap-y-1', ui?.className)}>
  {#each data.series as series (series.key)}
    <li class="text-muted-foreground flex items-center gap-1.5 text-xs">
      <span
        class="size-2.5 shrink-0 rounded-full"
        style="background: {series.color};"
        aria-hidden="true"
      ></span>
      {series.label}
    </li>
  {/each}
</ul>
