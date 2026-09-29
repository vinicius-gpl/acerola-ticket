<script lang="ts" module>
  import {
    maintenanceTypeLabel,
    type MaintenanceType,
  } from '@template/shared/domain/maintenance.util';
  import {
    type MaintenanceEntry,
    type MaintenanceLog,
    type PlannedMaintenance,
  } from '@template/shared/schemas/dashboard.schema';

  /**
   * MANUTENÇÕES — O QUE FOI FEITO, e o que o plano manda fazer hoje.
   *
   * Os três recortes (Dia, Semana, Mês) vêm prontos na MESMA resposta, e a troca entre eles é
   * instantânea: são poucas manutenções por mês, e buscar de novo a cada clique faria o painel
   * inteiro recarregar para mudar um bloco.
   *
   * O plano de hoje fica no ALTO, antes da lista: é a única parte do bloco que pede uma ação.
   * O resto é histórico, e histórico não se cobra.
   */
  export type LogPeriod = 'day' | 'week' | 'month';

  export type DashboardMaintenanceLogProps = {
    data: {
      log: MaintenanceLog;
      /** O que o plano automático manda abrir hoje, e se já foi feito. */
      plannedToday: readonly PlannedMaintenance[];
      isDoneToday: boolean;
    };
    state?: { isLoading?: boolean };
    ui?: { className?: string };
  };

  export const PERIOD_OPTIONS: { value: LogPeriod; label: string }[] = [
    { value: 'day', label: 'Dia' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mês' },
  ];

  /**
   * Uma manutenção em uma linha: o que foi feito, em qual máquina, por quem.
   *
   * Exportada para ter teste próprio: descrição vazia precisa continuar dizendo o TIPO, senão
   * a linha vira só um nome de máquina e ninguém sabe o que aconteceu com ela.
   */
  export function summaryOf(entry: MaintenanceEntry): string {
    const type = maintenanceTypeLabel(entry.type as MaintenanceType) || entry.type;
    const description = entry.description.trim();

    return description ? `${type} — ${description}` : type;
  }

  /** "por Carlos", quando se sabe quem fez. */
  export function performerOf(entry: MaintenanceEntry): string {
    return entry.performedBy?.trim() ? `por ${entry.performedBy}` : 'sem responsável anotado';
  }

  /** "há 4 meses sem abrir", ou "nunca foi aberta". */
  export function waitingOf(planned: PlannedMaintenance): string {
    if (planned.monthsSinceLast === null) return 'nunca foi aberta';

    const months = Math.round(planned.monthsSinceLast);

    return months === 1 ? 'há 1 mês sem abrir' : `há ${months} meses sem abrir`;
  }
</script>

<script lang="ts">
  import CalendarCheck from '@lucide/svelte/icons/calendar-check';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';

  import OptionPicker from '$lib/components/option-picker/option-picker.svelte';
  import PanelCard from '$lib/components/panel-card/panel-card.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';

  let { data, state: viewState, ui }: DashboardMaintenanceLogProps = $props();

  /* Estado puramente visual (CONTRIBUTING §3): qual recorte está na tela. */
  let period = $state<LogPeriod>('week');

  const entries = $derived(data.log[period]);
  const periodLabel = $derived(
    PERIOD_OPTIONS.find((option) => option.value === period)?.label.toLowerCase() ?? '',
  );
</script>

<PanelCard
  data={{ title: 'Manutenções — o que foi feito', hint: `Registradas no recorte de ${periodLabel}` }}
  ui={{ className: ui?.className }}
>
  {#snippet tools()}
    <OptionPicker
      data={{ value: period, options: PERIOD_OPTIONS }}
      ui={{ ariaLabel: 'Recorte das manutenções' }}
      actions={{ onChange: (value: string) => (period = value as LogPeriod) }}
    />
  {/snippet}

  <!-- O plano de hoje é a única parte que pede ação, então vem antes do histórico. O fundo é
       do cartão inteiro, nunca uma tarja colorida de um lado só. -->
  {#if data.plannedToday.length > 0}
    <div
      class="mb-4 rounded-box p-3 {data.isDoneToday
        ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100'
        : 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100'}"
    >
      <p class="flex items-center gap-2 text-xs font-semibold">
        {#if data.isDoneToday}
          <CalendarCheck class="size-4 shrink-0" aria-hidden="true" />
          A preventiva de hoje já foi feita
        {:else}
          <CalendarClock class="size-4 shrink-0" aria-hidden="true" />
          O plano de hoje ainda não foi feito
        {/if}
      </p>
      <ul class="mt-1.5 space-y-0.5">
        {#each data.plannedToday as planned (planned.computerId)}
          <li class="text-xs">
            <span class="font-medium">{planned.computerName}</span>
            <span class="opacity-80"> · {waitingOf(planned)}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if viewState?.isLoading}
    <p class="text-muted-foreground py-6 text-center text-sm">Lendo as manutenções…</p>
  {:else if entries.length === 0}
    <p class="text-muted-foreground py-6 text-center text-sm">
      Nenhuma manutenção registrada neste recorte.
    </p>
  {:else}
    <!-- Rola dentro do bloco: com trinta manutenções no mês, a página inteira viraria uma
         lista e o resto do painel sairia da primeira tela. -->
    <ul class="max-h-64 space-y-2.5 overflow-y-auto pr-1">
      {#each entries as entry (entry.id)}
        <li class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-foreground truncate text-sm font-medium">{entry.computerName}</p>
            <p class="text-muted-foreground text-xs">{summaryOf(entry)}</p>
          </div>
          <StatusBadge
            data={{ label: performerOf(entry) }}
            ui={{ tone: 'neutral', size: 'sm' }}
          />
        </li>
      {/each}
    </ul>
  {/if}
</PanelCard>
