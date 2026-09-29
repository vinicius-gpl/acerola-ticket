<script lang="ts" module>
  import type { ChartConfig } from '$lib/utils/chart-config';

  /**
   * MEDIDOR RADIAL — um número só, contra o quanto ele poderia ser.
   *
   * É o gráfico certo para "quanto de 100", e o errado para comparar categorias: um arco não
   * se compara com outro arco de outro cartão. Serve para "84 das 96 máquinas estão de pé" e
   * não serve para "qual departamento abriu mais chamados" — isso é barra.
   *
   * O arco de trás (a trilha) é o que faz o gráfico ser lido: sem ele, um arco de 20% e um de
   * 80% parecem só dois riscos de tamanhos diferentes, sem escala nenhuma.
   *
   * O número no meio vem sempre escrito. O arco é o reforço, nunca a única informação.
   */
  export type RadialChartProps = {
    data: {
      value: number;
      /** O teto da escala — o "de quanto". @default 100 */
      max?: number;
      /** O que está sendo medido: "Máquinas de pé". */
      label: string;
      /** O número grande no meio. Sem isto, o próprio valor. */
      display?: string;
      /** A linha pequena embaixo do número: "de 96 cadastradas". */
      hint?: string | null;
    };
    state?: { isLoading?: boolean };
    ui?: {
      /** A cor do arco. @default 'var(--chart-1)' */
      color?: string;
      className?: string;
      /** A altura da caixa de desenho. @default 'h-40' */
      heightClass?: string;
    };
  };

  const VALUE_KEY = 'value';

  /**
   * A fração preenchida, entre 0 e 1.
   *
   * Exportada para ter teste próprio: teto zero é divisão por zero, e valor acima do teto
   * desenharia um arco dando mais de uma volta — os dois viram um gráfico que mente.
   */
  export function fractionOf(value: number, max: number): number {
    if (max <= 0) return 0;

    return Math.min(1, Math.max(0, value / max));
  }
</script>

<script lang="ts">
  import { ArcChart } from 'layerchart';

  import ChartFrame from '$lib/components/chart-frame/chart-frame.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, state: chartState, ui }: RadialChartProps = $props();

  const max = $derived(data.max ?? 100);
  const color = $derived(ui?.color ?? 'var(--chart-1)');
  const fraction = $derived(fractionOf(data.value, max));
  const chartConfig = $derived<ChartConfig>({ [VALUE_KEY]: { label: data.label, color } });
</script>

{#if chartState?.isLoading}
  <div
    class={cn('bg-muted w-full animate-pulse rounded-box', ui?.heightClass ?? 'h-40', ui?.className)}
  ></div>
{:else}
  <div class={cn('flex w-full flex-col items-center', ui?.className)}>
    <div
      class={cn('relative w-full', ui?.heightClass ?? 'h-40')}
      role="img"
      aria-label="{data.label}: {data.display ?? data.value} de {max}"
    >
      <ChartFrame data={{ config: chartConfig }} ui={{ className: 'h-full w-full' }}>
        <ArcChart
          data={[{ key: VALUE_KEY, label: data.label, value: fraction }]}
          maxValue={1}
          range={[0, 360]}
          innerRadius={-16}
          outerRadius={-2}
          cornerRadius={8}
          trackInnerRadius={-16}
          trackOuterRadius={-2}
          tooltipContext={false}
          props={{ arc: { fill: color, track: { class: 'fill-muted' } } }}
        />
      </ChartFrame>

      <!-- No MEIO do anel vai só o que cabe no buraco: o número e o que ele mede.
           `px-[20%]` é a folga que impede o rótulo de encostar no arco. -->
      <div
        class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[20%] text-center"
      >
        <span class="text-foreground text-2xl leading-tight font-bold tabular-nums">
          {data.display ?? data.value}
        </span>
        <span class="text-muted-foreground text-[10px] leading-tight tracking-wide uppercase">
          {data.label}
        </span>
      </div>
    </div>

    <!-- A explicação vai FORA do anel, embaixo. Dentro, ela não cabe: o buraco tem pouco mais
         de cem pixels de largura, e uma frase como "7 manutenções feitas no período" atravessa
         o arco e fica ilegível por cima dele. -->
    {#if data.hint}
      <p class="text-muted-foreground mt-1 text-center text-[11px] leading-tight">{data.hint}</p>
    {/if}
  </div>
{/if}
