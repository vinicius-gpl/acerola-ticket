<script lang="ts" module>
  import { type PeakingMachine } from '@template/shared/schemas/dashboard.schema';

  import { type ChartSlice } from '$lib/utils/chart-slice';

  /**
   * MÁQUINAS BATENDO NO TETO: quantos episódios de 100% cada uma teve.
   *
   * É informativo, e a tela precisa dizer isso com todas as letras. TODO computador chega a
   * 100% de processador ao abrir um programa — apontar isso como defeito encheria o painel de
   * falso alarme. O que interessa é quem faz isso o tempo todo: quando alguém reclamar que a
   * máquina está lenta, o motivo já está aqui, medido, em vez de virar uma investigação.
   *
   * A alternância **Hoje / No mês** existe porque as duas respondem coisas diferentes: hoje é
   * "o que está acontecendo agora"; no mês é "isso é crônico ou foi um dia ruim".
   */
  export type PeakingRange = 'today' | 'month';

  export type AcerolaDashboardPeakingProps = {
    data: { machines: readonly PeakingMachine[] };
    state?: { isLoading?: boolean };
    ui?: { className?: string };
  };

  export const RANGE_OPTIONS: { value: PeakingRange; label: string }[] = [
    { value: 'today', label: 'Hoje' },
    { value: 'month', label: 'No mês' },
  ];

  /* O rótulo é texto de tela (português); a chave é do contrato (inglês). */
  const METRIC_LABELS: Record<NonNullable<PeakingMachine['topMetric']>, string> = {
    cpu: 'processador',
    memory: 'memória',
    disk: 'disco',
  };

  /**
   * As máquinas que bateram no teto NO RECORTE ESCOLHIDO, da que mais bateu para a que menos.
   *
   * Quem teve zero episódio some: uma barra de tamanho zero não é informação, é uma linha
   * riscada no eixo que faz o gráfico parecer quebrado.
   *
   * Exportada para ter teste próprio: mostrar a contagem do mês na aba "Hoje" faria a tela
   * acusar de crônica uma máquina que só teve um dia ruim.
   */
  export function toSlices(
    machines: readonly PeakingMachine[],
    range: PeakingRange,
  ): ChartSlice[] {
    return machines
      .map((machine) => ({
        label: labelOf(machine),
        value: range === 'today' ? machine.today : machine.month,
      }))
      .filter((slice) => slice.value > 0)
      .sort((a, b) => b.value - a.value);
  }

  /** "CONTABIL-03 · memória" — qual medida mais estourou entra no nome da barra. */
  function labelOf(machine: PeakingMachine): string {
    if (machine.topMetric === null) return machine.computerName;

    return `${machine.computerName} · ${METRIC_LABELS[machine.topMetric]}`;
  }
</script>

<script lang="ts">
  import ColumnChart from '$lib/components/acerola-column-chart/acerola-column-chart.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import PanelCard from '$lib/components/acerola-panel-card/acerola-panel-card.svelte';

  let { data, state: viewState, ui }: AcerolaDashboardPeakingProps = $props();

  /* Estado puramente visual (CONTRIBUTING §3): qual recorte está na tela. */
  let range = $state<PeakingRange>('today');

  const slices = $derived(toSlices(data.machines, range));
</script>

<PanelCard
  data={{
    title: 'Máquinas batendo no teto',
    hint: 'Informativo: todo computador chega a 100% de vez em quando. O que conta é quem faz isso sempre.',
  }}
  ui={{ className: ui?.className }}
>
  {#snippet tools()}
    <OptionPicker
      data={{ value: range, options: RANGE_OPTIONS }}
      ui={{ ariaLabel: 'Recorte dos picos' }}
      actions={{ onChange: (value: string) => (range = value as PeakingRange) }}
    />
  {/snippet}

  <!-- Deitado, o gráfico tem a altura do conteúdo: uma linha por barra. O teto aqui é para
       uma lista longa rolar dentro do bloco, em vez de esticar a página. -->
  <div class="max-h-72 overflow-x-hidden overflow-y-auto">
    <ColumnChart
      data={{ slices, seriesLabel: 'Episódios' }}
      state={{ isLoading: viewState?.isLoading }}
      ui={{
        orientation: 'horizontal',
        emptyLabel:
          range === 'today'
            ? 'Nenhuma máquina bateu no teto hoje.'
            : 'Nenhuma máquina bateu no teto neste mês.',
      }}
    />
  </div>
</PanelCard>
