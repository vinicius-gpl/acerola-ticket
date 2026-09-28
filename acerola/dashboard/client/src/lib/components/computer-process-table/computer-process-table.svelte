<script lang="ts" module>
  import { type ComputerLive } from '@template/shared/schemas/computer-live.schema';

  export type ComputerProcessTableProps = {
    data: {
      processes: ComputerLive['processes'];
    };
    ui?: {
      /** Quantos aplicativos mostrar. O resto vira uma linha de "e mais N". */
      limit?: number;
    };
    state?: {
      isLoading?: boolean;
    };
  };

  const DEFAULT_LIMIT = 10;
</script>

<script lang="ts">
  import { formatBytes, formatPercent } from '$lib/utils/format-machine';

  let { data, ui, state: viewState }: ComputerProcessTableProps = $props();

  const limit = $derived(ui?.limit ?? DEFAULT_LIMIT);
  const shown = $derived(data.processes.slice(0, limit));
  const hidden = $derived(Math.max(0, data.processes.length - limit));
</script>

{#if viewState?.isLoading}
  <p class="text-ink-500 text-sm">Lendo a máquina…</p>
{:else if data.processes.length === 0}
  <p class="text-ink-500 text-sm">Nenhum aplicativo informado nesta leitura.</p>
{:else}
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="text-ink-500 border-b text-left text-xs">
          <th class="pb-2 font-medium">Aplicativo</th>
          <th class="pb-2 text-right font-medium">Processador</th>
          <th class="pb-2 text-right font-medium">Memória</th>
        </tr>
      </thead>
      <tbody>
        {#each shown as process (process.name)}
          <tr class="border-b last:border-0">
            <td class="text-ink-900 max-w-0 truncate py-2 pr-3">
              {process.name}
              {#if process.instanceCount > 1}
                <!-- O Chrome abre um processo por aba: dizer quantos são explica um número de
                     memória que, de outro modo, pareceria absurdo para um "programa só". -->
                <span class="text-ink-500 text-xs">({process.instanceCount} processos)</span>
              {/if}
            </td>
            <td class="text-ink-900 py-2 text-right tabular-nums">
              {formatPercent(process.cpuPercent)}
            </td>
            <td class="text-ink-900 py-2 text-right tabular-nums">
              {formatBytes(process.memBytes)}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if hidden > 0}
    <p class="text-ink-500 mt-2 text-xs">
      e mais {hidden} aplicativo{hidden === 1 ? '' : 's'} com consumo menor.
    </p>
  {/if}
{/if}
