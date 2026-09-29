<script lang="ts" module>
  /**
   * O BALÃO que segue o ponteiro dentro de um gráfico.
   *
   * É o `ChartTooltip` do shadcn-svelte, escrito aqui em vez de baixado pelo mesmo motivo da
   * moldura (CONTRIBUTING §5). Duas diferenças de propósito em relação ao original:
   *
   *  - **O número sai em português** (`pt-BR`): 1.240, e não 1,240. O original usa o idioma
   *    do navegador, e aí o mesmo painel mostra o mesmo número de dois jeitos.
   *  - **O rótulo da série vem do `config` da moldura**, então o balão escreve "Processador"
   *    e nunca `cpuPercent`.
   *
   * Vai sempre dentro do snippet `tooltip` de um gráfico do LayerChart — fora dele não há
   * ponteiro nem série para mostrar.
   */
  export type ChartTooltipProps = {
    ui?: {
      className?: string;
      /** Esconde a linha de cima (o "quando"/"o quê"). Útil na rosca, onde ela repete a fatia. */
      isLabelHidden?: boolean;
    };
    /** Como escrever a linha de cima — a data crua vira "23/09" ou "14h". */
    actions?: { onFormatLabel?: (value: unknown) => string };
  };

  /** O número como a pessoa escreve. Fora disso, o valor como veio. */
  export function formatValue(value: unknown): string {
    return typeof value === 'number' ? value.toLocaleString('pt-BR') : String(value ?? '');
  }
</script>

<script lang="ts">
  import { getChartContext, Tooltip as TooltipPrimitive } from 'layerchart';

  import { getChartConfigContext } from '$lib/utils/chart-config';
  import { cn } from '$lib/utils/cn';

  let { ui, actions }: ChartTooltipProps = $props();

  const chartConfig = getChartConfigContext();
  const chartContext = getChartContext();

  /* Só as séries COM valor: numa rosca, todas as fatias entram na lista e só a apontada
     tem valor — sem o filtro, o balão de uma fatia listaria as treze. */
  const series = $derived(chartContext.tooltip.series.filter((item) => item.value !== undefined));

  const heading = $derived.by(() => {
    if (ui?.isLabelHidden) return null;

    const data = chartContext.tooltip.data;
    if (data === null || data === undefined) return null;

    const raw = chartContext.x(data);

    return actions?.onFormatLabel ? actions.onFormatLabel(raw) : formatValue(raw);
  });

  /** O nome que a pessoa lê: o do contrato da moldura ganha do da biblioteca. */
  function labelOf(key: string | undefined, fallback: string | undefined): string {
    return (key ? chartConfig.config[key]?.label : undefined) ?? fallback ?? key ?? '';
  }
</script>

<TooltipPrimitive.Root variant="none">
  <div
    class={cn(
      'border-border/50 bg-background grid min-w-32 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl',
      ui?.className,
    )}
  >
    {#if heading}
      <div class="text-foreground font-medium">{heading}</div>
    {/if}

    <div class="grid gap-1.5">
      {#each series as item, index (`${item.key}-${index}`)}
        <div class="flex w-full items-center gap-2">
          <span
            class="size-2.5 shrink-0 rounded-[2px]"
            style="background: {item.config?.color ?? item.color};"
            aria-hidden="true"
          ></span>
          <span class="text-muted-foreground flex-1">{labelOf(item.key, item.label)}</span>
          <span class="text-foreground font-medium tabular-nums">{formatValue(item.value)}</span>
        </div>
      {/each}
    </div>
  </div>
</TooltipPrimitive.Root>
