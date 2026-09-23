<script lang="ts" module>
  import {
    PREVENTIVE_INTERVAL_MONTHS,
    isFrequentlyServiced,
    preventiveStatusLabel,
    preventiveStatusTone,
  } from '@template/shared/domain/maintenance.util';
  import { departmentLabel } from '@template/shared/domain/department.util';
  import { type PreventiveDue } from '@template/shared/schemas/maintenance.schema';

  /**
   * O LEMBRETE que não depende de ninguém lembrar: quais máquinas passaram do prazo de
   * manutenção.
   *
   * Função pura de props: a situação já vem calculada pela API (é o cruzamento do inventário
   * com o histórico). O componente só ordena a leitura e oferece a ação.
   *
   * **As máquinas em dia não entram na lista.** Quem abre esta seção quer saber o que está
   * pendente; mostrar quarenta máquinas em dia para achar três vencidas é esconder a
   * resposta dentro do ruído. O total em dia aparece como uma linha de texto.
   */
  export type PreventiveBoardProps = {
    data: { rows: PreventiveDue[] };
    state?: { isLoading?: boolean };
    actions: { onRegister: (row: PreventiveDue) => void };
  };

  /** O nome que a pessoa reconhece: o apelido ganha do nome técnico da máquina. */
  export function machineLabelOf(row: PreventiveDue): string {
    return row.computerDisplayName?.trim() || row.computerName;
  }

  /** Só o que está pendente — vencida ou nunca aberta. */
  export function pendingOf(rows: readonly PreventiveDue[]): PreventiveDue[] {
    return rows.filter((row) => row.status !== 'ok');
  }
</script>

<script lang="ts">
  import CalendarCheck from '@lucide/svelte/icons/calendar-check';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';
  import { formatDate } from '$lib/utils/format-date';

  let { data, state: boardState, actions }: PreventiveBoardProps = $props();

  const pending = $derived(pendingOf(data.rows));
  const upToDate = $derived(data.rows.length - pending.length);
</script>

<section class="bg-card rounded-xl border p-4">
  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
    <div>
      <h2 class="text-ink-900 text-sm font-semibold">Manutenção preventiva</h2>
      <p class="text-ink-500 text-xs">
        Toda máquina precisa de uma a cada {PREVENTIVE_INTERVAL_MONTHS} meses. Corretiva conta como
        feita.
      </p>
    </div>
    {#if !boardState?.isLoading && data.rows.length > 0}
      <span class="text-ink-500 text-xs">{upToDate} em dia</span>
    {/if}
  </div>

  <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
  {#if boardState?.isLoading}
    <p class="text-ink-500 py-6 text-center text-sm">Conferindo as máquinas…</p>
  {:else if data.rows.length === 0}
    <p class="text-ink-500 text-sm">
      Nenhuma máquina no inventário ainda. Cadastre uma e ela passa a ser cobrada aqui.
    </p>
  {:else if pending.length === 0}
    <p class="flex items-center gap-2 text-sm text-emerald-700">
      <CalendarCheck class="size-4" aria-hidden="true" />
      Todas as {data.rows.length} máquinas estão em dia.
    </p>
  {:else}
    <ul class="flex flex-col divide-y">
      {#each pending as row (row.computerId)}
        <li class="flex flex-wrap items-center justify-between gap-2 py-2">
          <div class="min-w-0">
            <p class="text-ink-900 text-sm font-semibold break-words">{machineLabelOf(row)}</p>
            <p class="text-ink-500 text-xs">
              {row.computerDepartment ? departmentLabel(row.computerDepartment) : 'Sem departamento'}
              ·
              {#if row.lastDoneAt}
                última em {formatDate(row.lastDoneAt)}
              {:else}
                <!-- "nunca passou por manutenção" seria mentira numa máquina que teve
                     limpeza ou troca de peça: o que falta é preventiva ou corretiva. -->
                sem preventiva ou corretiva registrada
              {/if}
              {#if isFrequentlyServiced(row.maintenanceCount)}
                · <span class="text-amber-700">
                  já foram {row.maintenanceCount} manutenções nesta máquina
                </span>
              {/if}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <StatusBadge
              data={{ label: preventiveStatusLabel(row.status) }}
              ui={{ tone: preventiveStatusTone(row.status), size: 'sm' }}
            />
            <ActionButton
              data={{ label: 'Registrar' }}
              ui={{ variant: 'secondary', size: 'sm' }}
              actions={{ onClick: () => actions.onRegister(row) }}
            />
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>
