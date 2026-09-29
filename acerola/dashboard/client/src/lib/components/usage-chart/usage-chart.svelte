<script lang="ts" module>
  import type { TimePoint, TimeSeriesDef } from '$lib/utils/time-series';

  /**
   * O USO DA MÁQUINA AO LONGO DO TEMPO — processador, memória e disco na mesma escala.
   *
   * É o `AreaChart` com as três séries fixas e a escala travada em 0–100%. Existe como
   * componente próprio, e não como uma chamada solta do gráfico de área, porque a ficha da
   * máquina e o painel ao vivo precisam mostrar EXATAMENTE as mesmas três séries, com as
   * mesmas cores e os mesmos nomes — duas telas montando a lista por conta própria é como
   * "Memória" fica verde numa e azul na outra.
   *
   * Sobrepostas e não empilhadas: as três são porcentagem de 0 a 100, e empilhá-las daria
   * 240% de nada. É a sobreposição que deixa ver de relance "a memória estava no talo
   * enquanto o processador dormia".
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
    ui?: {
      emptyLabel?: string;
      className?: string;
      /**
       * A altura da caixa de desenho.
       *
       * O padrão é ALTO de propósito: são vinte e quatro horas de leitura de três medidas
       * sobrepostas, e num quadro baixo as três viram uma mancha só — a forma da curva, que é
       * a única coisa que este gráfico existe para mostrar, some.
       *
       * @default 'h-72'
       */
      heightClass?: string;
    };
  };

  /* O rótulo é texto de tela (português); a chave é do contrato (inglês). */
  export const USAGE_SERIES: TimeSeriesDef[] = [
    { key: 'cpuPercent', label: 'Processador', color: 'var(--chart-1)' },
    { key: 'memoryPercent', label: 'Memória', color: 'var(--chart-4)' },
    { key: 'diskPercent', label: 'Disco', color: 'var(--chart-5)' },
  ];

  /**
   * Da leitura do agente para o formato do gráfico de tempo.
   *
   * Exportada para ter teste próprio: trocar duas medidas de lugar aqui desenha um gráfico
   * bonito que mente, e é justamente por ele que alguém decide trocar uma peça.
   */
  export function toPoints(readings: readonly UsagePoint[]): TimePoint[] {
    return readings.map((reading) => ({
      at: reading.at,
      values: {
        cpuPercent: reading.cpuPercent,
        memoryPercent: reading.memoryPercent,
        diskPercent: reading.diskPercent,
      },
    }));
  }
</script>

<script lang="ts">
  import AreaChart from '$lib/components/area-chart/area-chart.svelte';

  let { data, state, ui }: UsageChartProps = $props();

  const points = $derived(toPoints(data.points));
</script>

<AreaChart
  data={{ points, series: USAGE_SERIES }}
  state={{ isLoading: state?.isLoading }}
  ui={{
    emptyLabel: ui?.emptyLabel ?? 'Sem leituras no período.',
    className: ui?.className,
    heightClass: ui?.heightClass ?? 'h-72',
    layout: 'overlap',
    tick: 'hour',
    isPercent: true,
  }}
/>
