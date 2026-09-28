<script lang="ts" module>
  import { type ComputerLive } from '@template/shared/schemas/computer-live.schema';

  export type ComputerLivePanelProps = {
    data: {
      /** Nulo quando a máquina nunca enviou nada — o agente ainda não foi instalado nela. */
      live: ComputerLive | null;
    };
    state?: {
      isLoading?: boolean;
    };
  };
</script>

<script lang="ts">
  import EmptyState from '$lib/components/empty-state/empty-state.svelte';
  import UsageMeter from '$lib/components/usage-meter/usage-meter.svelte';
  import { formatBytes, formatPercent } from '$lib/utils/format-machine';
  import MonitorOff from '@lucide/svelte/icons/monitor-off';

  let { data, state: viewState }: ComputerLivePanelProps = $props();

  const live = $derived(data.live);

  /** Bytes por segundo em palavras. A unidade é por segundo: é taxa, não tamanho. */
  const perSecond = (bytes: number) => `${formatBytes(bytes)}/s`;

  const memoryDetail = $derived(
    live ? `${formatBytes(live.memory.usedBytes)} de ${formatBytes(live.memory.totalBytes)}` : '',
  );

  /* A rede vem por interface, e quase sempre só uma está em uso. As paradas ficam de fora:
     listar seis adaptadores zerados esconderia a única que interessa. */
  const activeInterfaces = $derived(
    (live?.network ?? []).filter(
      (item) => item.bytesRecvPerSec > 0 || item.bytesSentPerSec > 0,
    ),
  );
</script>

{#if viewState?.isLoading}
  <p class="text-ink-500 text-sm">Lendo a máquina…</p>
{:else if !live}
  <EmptyState
    data={{
      title: 'Nada sendo medido ainda',
      description:
        'Esta máquina ainda não enviou nenhuma leitura. Instale o agente nela e cole a chave que aparece ao cadastrar o computador.',
    }}
    ui={{ icon: MonitorOff }}
  />
{:else}
  <div class="grid gap-6 lg:grid-cols-2">
    <div class="min-w-0">
      <h3 class="text-ink-500 mb-3 text-xs font-semibold tracking-wider uppercase">
        Processador — {formatPercent(live.cpu.percentTotal)} no total
      </h3>

      {#if live.cpu.percentPerCore.length === 0}
        <p class="text-ink-500 text-xs">Esta versão do agente não informa o uso por núcleo.</p>
      {:else}
        <div class="grid gap-2 sm:grid-cols-2">
          {#each live.cpu.percentPerCore as core, index (index)}
            <UsageMeter data={{ label: `Núcleo ${index + 1}`, percentage: core }} />
          {/each}
        </div>
      {/if}
    </div>

    <div class="min-w-0">
      <h3 class="text-ink-500 mb-3 text-xs font-semibold tracking-wider uppercase">Memória</h3>
      <UsageMeter
        data={{ label: 'Em uso', percentage: live.memory.usedPercent, detail: memoryDetail }}
      />

      {#if live.memory.swapTotalBytes > 0}
        <!-- A memória virtual só aparece quando existe: num Windows sem arquivo de paginação,
             uma linha zerada seria ruído permanente. -->
        <div class="mt-3">
          <UsageMeter
            data={{
              label: 'Memória virtual (swap)',
              percentage: live.memory.swapUsedPercent,
              detail: `${formatBytes(live.memory.swapUsedBytes)} de ${formatBytes(live.memory.swapTotalBytes)}`,
            }}
          />
        </div>
      {/if}
    </div>

    <div class="min-w-0">
      <h3 class="text-ink-500 mb-3 text-xs font-semibold tracking-wider uppercase">Volumes</h3>

      {#if live.disks.length === 0}
        <p class="text-ink-500 text-xs">Nenhum volume informado.</p>
      {:else}
        <div class="grid gap-3">
          {#each live.disks as disk (disk.mountpoint)}
            <UsageMeter
              data={{
                label: disk.mountpoint,
                percentage: disk.usedPercent,
                detail: `${formatBytes(disk.freeBytes)} livres de ${formatBytes(disk.totalBytes)}`,
              }}
            />
          {/each}
        </div>
      {/if}

      <p class="text-ink-500 mt-3 text-xs">
        Leitura {perSecond(live.diskIo.readBytesPerSec)} · Escrita
        {perSecond(live.diskIo.writeBytesPerSec)}
      </p>
    </div>

    <div class="min-w-0">
      <h3 class="text-ink-500 mb-3 text-xs font-semibold tracking-wider uppercase">Rede</h3>

      {#if activeInterfaces.length === 0}
        <p class="text-ink-500 text-xs">Sem tráfego neste instante.</p>
      {:else}
        <dl class="grid gap-2">
          {#each activeInterfaces as item (item.name)}
            <div class="flex items-baseline justify-between gap-2">
              <dt class="text-ink-700 truncate text-xs">{item.name}</dt>
              <dd class="text-ink-900 shrink-0 text-xs tabular-nums">
                ↓ {perSecond(item.bytesRecvPerSec)} · ↑ {perSecond(item.bytesSentPerSec)}
              </dd>
            </div>
          {/each}
        </dl>
      {/if}
    </div>
  </div>
{/if}
