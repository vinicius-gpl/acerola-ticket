<script lang="ts" module>
  import {
    maintenanceTypeLabel,
    type MaintenanceType,
  } from '@template/shared/domain/maintenance.util';
  import {
    ticketProblemTypeLabel,
    type TicketProblemType,
  } from '@template/shared/domain/ticket-catalog.util';
  import { type CountByKey } from '@template/shared/schemas/dashboard.schema';

  import { type ChartSlice } from '$lib/utils/chart-slice';

  /**
   * O MAPA DE PROBLEMAS: como o mês se divide entre os tipos de coisa que deram errado.
   *
   * A alternância entre **Chamados** e **Manutenção** é o que o bloco tem de essencial, e é o
   * mesmo par do sistema antigo: as duas listas respondem à mesma pergunta por caminhos
   * diferentes. "Impressora" campeã nos chamados é gente reclamando; "Formatação" campeã na
   * manutenção é trabalho que o TI já fez. Ver as duas no MESMO desenho, uma de cada vez,
   * deixa comparar sem abrir outra tela — somá-las não deixaria, porque são coisas diferentes.
   *
   * Rosca, e não barra: aqui a pergunta é "quanto do bolo é impressora", e a resposta é uma
   * fração do todo. Barra responderia "quantas impressoras", que é outra coisa.
   */
  export type ProblemMapSource = 'tickets' | 'maintenance';

  export type DashboardProblemMapProps = {
    data: {
      /** Os tipos de problema dos chamados do período. */
      byProblemType: readonly CountByKey[];
      /** Os tipos de manutenção do mês. */
      byMaintenanceType: readonly CountByKey[];
    };
    state?: { isLoading?: boolean };
    ui?: { className?: string };
    actions?: { onSelectProblem?: (label: string) => void };
  };

  export const SOURCE_OPTIONS: { value: ProblemMapSource; label: string }[] = [
    { value: 'tickets', label: 'Chamados' },
    { value: 'maintenance', label: 'Manutenção' },
  ];

  /**
   * As contagens viram fatias com o nome que a pessoa lê.
   *
   * Exportada para ter teste próprio: uma chave que o catálogo não conhece precisa continuar
   * aparecendo com a chave crua, e não sumir do desenho — fatia que some esconde que há
   * registro com um tipo que ninguém cadastrou.
   */
  export function toSlices(rows: readonly CountByKey[], source: ProblemMapSource): ChartSlice[] {
    return rows.map((row) => ({ label: labelOf(row.key, source), value: row.count }));
  }

  function labelOf(key: string, source: ProblemMapSource): string {
    const label =
      source === 'tickets'
        ? ticketProblemTypeLabel(key as TicketProblemType)
        : maintenanceTypeLabel(key as MaintenanceType);

    return label || key;
  }
</script>

<script lang="ts">
  import DonutChart from '$lib/components/donut-chart/donut-chart.svelte';
  import OptionPicker from '$lib/components/option-picker/option-picker.svelte';
  import PanelCard from '$lib/components/panel-card/panel-card.svelte';

  let { data, state: viewState, ui, actions }: DashboardProblemMapProps = $props();

  /* Estado puramente visual (CONTRIBUTING §3): qual das duas listas está na tela. */
  let source = $state<ProblemMapSource>('tickets');

  const rows = $derived(source === 'tickets' ? data.byProblemType : data.byMaintenanceType);
  const slices = $derived(toSlices(rows, source));
  const seriesLabel = $derived(source === 'tickets' ? 'Chamados' : 'Manutenções');
  const hint = $derived(
    source === 'tickets'
      ? 'O que as pessoas mais abriram no período'
      : 'O que o TI mais fez no mês',
  );
</script>

<PanelCard data={{ title: 'Mapa de problemas', hint }} ui={{ className: ui?.className }}>
  {#snippet tools()}
    <OptionPicker
      data={{ value: source, options: SOURCE_OPTIONS }}
      ui={{ ariaLabel: 'O que o mapa mostra' }}
      actions={{ onChange: (value: string) => (source = value as ProblemMapSource) }}
    />
  {/snippet}

  <!-- Altura de verdade: o desenho preenche o espaço que recebe, e sem uma caixa com altura
       ele nasceria com zero e a legenda vazaria por cima do bloco seguinte. -->
  <div class="h-72 sm:h-64">
    <DonutChart
      data={{ slices, seriesLabel }}
      state={{ isLoading: viewState?.isLoading }}
      ui={{
        emptyLabel:
          source === 'tickets' ? 'Nenhum chamado no período.' : 'Nenhuma manutenção no mês.',
      }}
      actions={{ onSelect: actions?.onSelectProblem }}
    />
  </div>
</PanelCard>
