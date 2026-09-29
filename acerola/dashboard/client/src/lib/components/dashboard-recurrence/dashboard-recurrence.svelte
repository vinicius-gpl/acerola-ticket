<script lang="ts" module>
  import {
    ticketProblemTypeLabel,
    type TicketProblemType,
  } from '@template/shared/domain/ticket-catalog.util';
  import {
    RECURRENCE_THRESHOLD,
    type RecurringByMachine,
    type RecurringByPerson,
  } from '@template/shared/schemas/dashboard.schema';

  import { type ChartSlice } from '$lib/utils/chart-slice';

  /**
   * RECORRÊNCIA: o mesmo problema acontecendo de novo, e de novo.
   *
   * É a pergunta que um número total não responde. "Catorze chamados no mês" pode ser catorze
   * coisas diferentes; "a mesma pessoa abriu quatro de impressora" é um problema que ninguém
   * resolveu, e que vai voltar na semana que vem.
   *
   * Duas leituras, e a alternância entre elas é o bloco inteiro:
   *
   *  - **Por pessoa** aponta para treinamento, ou para um equipamento compartilhado;
   *  - **Por máquina** aponta para troca de equipamento — e é o que o sistema antigo não
   *    conseguia ver, porque lá o chamado não apontava para computador nenhum.
   *
   * Barra DEITADA: o rótulo é "Bia Costa · Impressora", e em pé isso vira um leque ilegível.
   */
  export type RecurrenceView = 'person' | 'machine';

  export type DashboardRecurrenceProps = {
    data: {
      byPerson: readonly RecurringByPerson[];
      byMachine: readonly RecurringByMachine[];
    };
    state?: { isLoading?: boolean };
    ui?: { className?: string };
  };

  export const VIEW_OPTIONS: { value: RecurrenceView; label: string }[] = [
    { value: 'person', label: 'Por pessoa' },
    { value: 'machine', label: 'Por máquina' },
  ];

  /**
   * "Quem · o quê" numa barra só.
   *
   * Exportadas para ter teste próprio: juntar a pessoa com o problema errado apontaria a
   * troca de equipamento para a máquina errada.
   */
  export function personSlices(rows: readonly RecurringByPerson[]): ChartSlice[] {
    return rows.map((row) => ({
      label: `${row.requesterName} · ${problemLabel(row.problemType)}`,
      value: row.count,
    }));
  }

  export function machineSlices(rows: readonly RecurringByMachine[]): ChartSlice[] {
    return rows.map((row) => ({
      label: `${row.computerName} · ${problemLabel(row.problemType)}`,
      value: row.count,
    }));
  }

  function problemLabel(key: string): string {
    return ticketProblemTypeLabel(key as TicketProblemType) || key;
  }
</script>

<script lang="ts">
  import ColumnChart from '$lib/components/column-chart/column-chart.svelte';
  import OptionPicker from '$lib/components/option-picker/option-picker.svelte';
  import PanelCard from '$lib/components/panel-card/panel-card.svelte';

  let { data, state: viewState, ui }: DashboardRecurrenceProps = $props();

  /* Estado puramente visual (CONTRIBUTING §3): qual das duas leituras está na tela. */
  let view = $state<RecurrenceView>('person');

  const slices = $derived(
    view === 'person' ? personSlices(data.byPerson) : machineSlices(data.byMachine),
  );

  const hint = $derived(
    view === 'person'
      ? `A partir de ${RECURRENCE_THRESHOLD} vezes no mês — aponta para treinamento ou equipamento compartilhado`
      : `A partir de ${RECURRENCE_THRESHOLD} vezes no mês — aponta para troca de equipamento`,
  );
</script>

<PanelCard data={{ title: 'O que está se repetindo', hint }} ui={{ className: ui?.className }}>
  {#snippet tools()}
    <OptionPicker
      data={{ value: view, options: VIEW_OPTIONS }}
      ui={{ ariaLabel: 'Como agrupar a recorrência' }}
      actions={{ onChange: (value: string) => (view = value as RecurrenceView) }}
    />
  {/snippet}

  <!-- Deitado, o gráfico tem a altura do conteúdo: uma linha por barra. O teto aqui é para
       uma lista longa rolar dentro do bloco, em vez de esticar a página. -->
  <div class="max-h-72 overflow-x-hidden overflow-y-auto">
    <ColumnChart
      data={{ slices, seriesLabel: 'Chamados' }}
      state={{ isLoading: viewState?.isLoading }}
      ui={{
        orientation: 'horizontal',
        emptyLabel: 'Nada se repetiu no mês. É a melhor notícia deste painel.',
      }}
    />
  </div>
</PanelCard>
