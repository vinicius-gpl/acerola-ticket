<script lang="ts" module>
  import {
    alertDurationSeconds,
    alertMetricLabel,
    type AlertMetric,
  } from '@template/shared/domain/computer-alert.util';
  import {
    healthStatusLabel,
    healthStatusTone,
  } from '@template/shared/domain/computer-health.util';
  import { departmentLabel } from '@template/shared/domain/department.util';
  import {
    type Computer,
    type ComputerAlert,
    type ComputerSample,
  } from '@template/shared/schemas/computer.schema';
  import {
    maintenanceTypeLabel,
    maintenanceTypeTone,
  } from '@template/shared/domain/maintenance.util';
  import { type Maintenance } from '@template/shared/schemas/maintenance.schema';
  import {
    movementTypeLabel,
    movementTypeTone,
  } from '@template/shared/domain/part-catalog.util';
  import { type PartMovement } from '@template/shared/schemas/part.schema';

  import { formatBytes, formatDuration } from '$lib/utils/format-machine';

  /**
   * A FICHA DE UM COMPUTADOR: quem é, como está e o que já aconteceu com ele.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook com a
   * máquina saudável, em estado crítico, bloqueada, arquivada e sem o agente instalado.
   *
   * A ordem da tela é a ordem da pergunta que se faz: primeiro o que está errado (os avisos
   * de saúde), depois o que a máquina é (hardware), depois como ela vem se comportando
   * (gráfico) e por último o histórico (alertas). Quem abre a ficha está atrás de problema.
   */
  export type ComputerDetailViewProps = {
    data: {
      computer: Computer;
      samples: ComputerSample[];
      alerts: ComputerAlert[];
      /** O que já foi feito nesta máquina. Vem da feature de Manutenção; a ficha só lê. */
      maintenances: Maintenance[];
      /** As peças que saíram do depósito para esta máquina. A ficha também só lê. */
      partMovements: PartMovement[];
    };
    state?: {
      isSamplesLoading?: boolean;
      isAlertsLoading?: boolean;
      isMaintenancesLoading?: boolean;
      isPartsLoading?: boolean;
      isSaving?: boolean;
      actionError?: string | null;
    };
    actions: {
      onEdit: () => void;
      /** Abre o formulário de manutenção já com esta máquina escolhida. */
      onRegisterMaintenance: () => void;
      onArchivedChange: (isArchived: boolean) => void;
      onBlockedChange: (isBlocked: boolean, reason?: string) => void;
      onRegenerateToken: () => void;
      onBack: () => void;
    };
  };

  export type HardwareFact = { label: string; value: string };

  /**
   * Os fatos de hardware, já em palavras.
   *
   * Exportado e puro para ter teste próprio: é aqui que "ainda não sei" (nulo) precisa virar
   * traço, e não "0 B" — uma máquina recém-cadastrada não tem disco de tamanho zero, ela tem
   * disco não medido, e as duas coisas levam a decisões diferentes.
   */
  export function hardwareFacts(computer: Computer): HardwareFact[] {
    const { hardware } = computer;
    const free = hardware.freeDiskBytes;

    return [
      { label: 'Sistema', value: hardware.os ?? '—' },
      { label: 'Processador', value: hardware.cpuModel ?? '—' },
      {
        label: 'Núcleos',
        value: hardware.logicalCpus ? `${hardware.logicalCpus} (lógicos)` : '—',
      },
      { label: 'Memória', value: formatBytes(hardware.totalMemoryBytes) },
      {
        label: 'Disco',
        value: hardware.totalDiskBytes
          ? `${formatBytes(free)} livres de ${formatBytes(hardware.totalDiskBytes)}`
          : '—',
      },
      { label: 'Endereço na rede', value: hardware.localIp ?? '—' },
      { label: 'Endereço físico (MAC)', value: hardware.macAddress ?? '—' },
      { label: 'Ligada há', value: formatDuration(hardware.uptimeSeconds) },
      { label: 'Versão do agente', value: computer.agentVersion ?? '—' },
    ];
  }

  /** Quanto durou o episódio, em palavras — ou que ele ainda está acontecendo. */
  export function alertDurationLabel(alert: ComputerAlert): string {
    const seconds = alertDurationSeconds(alert.startedAt, alert.recoveredAt);

    return seconds === null ? 'Acontecendo agora' : formatDuration(seconds);
  }

  export function metricLabel(metric: AlertMetric): string {
    return alertMetricLabel(metric);
  }

  /**
   * O tom do cartão da nota, a partir da situação de saúde.
   *
   * O tom do selo e o do cartão saem da MESMA fonte: com dois mapas, a mesma máquina
   * apareceria vermelha no selo e amarela no cartão, e ninguém saberia qual acreditar.
   */
  const CARD_TONES = { good: 'success', attention: 'warning', critical: 'danger' } as const;
</script>

<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import KeyRound from '@lucide/svelte/icons/key-round';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Wrench from '@lucide/svelte/icons/wrench';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ConfirmDialog from '$lib/components/confirm-dialog/confirm-dialog.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import PageHeader from '$lib/components/page-header/page-header.svelte';
  import StatCard from '$lib/components/stat-card/stat-card.svelte';
  import StatCardGrid from '$lib/components/stat-card-grid/stat-card-grid.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';
  import UsageChart from '$lib/components/usage-chart/usage-chart.svelte';
  import ComputerBlockDialog from '$lib/components/computer-block-dialog/computer-block-dialog.svelte';
  import { formatDateTime } from '$lib/utils/format-date';
  import { formatPercent, formatTimeAgo } from '$lib/utils/format-machine';

  /* O prop precisa de outro nome aqui dentro: um binding local chamado `state` faz o
     compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune. */
  let { data, state: viewState, actions }: ComputerDetailViewProps = $props();

  const computer = $derived(data.computer);
  const facts = $derived(hardwareFacts(computer));
  const lastSample = $derived(data.samples.at(-1) ?? null);

  const points = $derived(
    data.samples.map((sample) => ({
      at: sample.sampledAt,
      cpuPercent: sample.cpuPercent,
      memoryPercent: sample.memoryPercent,
      diskPercent: sample.diskPercent,
    })),
  );

  /* Qual pergunta está na frente da tela. É estado VISUAL: não é dado, é qual peça está
     aberta — por isso pode morar aqui (CONTRIBUTING §3). */
  let pending = $state<'archive' | 'unarchive' | 'unblock' | 'token' | 'block' | null>(null);

  function confirmPending(): void {
    if (pending === 'archive') actions.onArchivedChange(true);
    if (pending === 'unarchive') actions.onArchivedChange(false);
    if (pending === 'unblock') actions.onBlockedChange(false);
    if (pending === 'token') actions.onRegenerateToken();

    pending = null;
  }
</script>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-10 sm:px-6">
  <ActionButton
    data={{ label: 'Voltar ao inventário' }}
    ui={{ variant: 'ghost', size: 'sm', icon: ArrowLeft, className: 'self-start' }}
    actions={{ onClick: actions.onBack }}
  />

  <PageHeader
    data={{
      title: computer.displayName?.trim() || computer.name,
      description: `${computer.name} · ${computer.department ? departmentLabel(computer.department) : 'Sem departamento'} · ${computer.responsibleName ?? 'Sem responsável'}`,
    }}
  >
    <ActionButton
      data={{ label: 'Editar identificação' }}
      ui={{ variant: 'secondary', icon: Pencil }}
      state={{ isDisabled: viewState?.isSaving }}
      actions={{ onClick: actions.onEdit }}
    />
    <ActionButton
      data={{ label: 'Gerar token novo' }}
      ui={{ variant: 'secondary', icon: KeyRound }}
      state={{ isDisabled: viewState?.isSaving }}
      actions={{ onClick: () => (pending = 'token') }}
    />
    {#if computer.isBlocked}
      <ActionButton
        data={{ label: 'Desbloquear' }}
        ui={{ variant: 'secondary' }}
        state={{ isDisabled: viewState?.isSaving }}
        actions={{ onClick: () => (pending = 'unblock') }}
      />
    {:else}
      <ActionButton
        data={{ label: 'Bloquear' }}
        ui={{ variant: 'secondary' }}
        state={{ isDisabled: viewState?.isSaving }}
        actions={{ onClick: () => (pending = 'block') }}
      />
    {/if}
    {#if computer.isArchived}
      <ActionButton
        data={{ label: 'Tirar do arquivo' }}
        ui={{ variant: 'secondary' }}
        state={{ isDisabled: viewState?.isSaving }}
        actions={{ onClick: () => (pending = 'unarchive') }}
      />
    {:else}
      <ActionButton
        data={{ label: 'Arquivar' }}
        ui={{ variant: 'danger' }}
        state={{ isDisabled: viewState?.isSaving }}
        actions={{ onClick: () => (pending = 'archive') }}
      />
    {/if}
  </PageHeader>

  <!-- A falha de uma AÇÃO aparece aqui em cima, em vermelho, e fica até resolver: gravação
       que falha calada vira "o sistema não salva" (CONTRIBUTING §15). -->
  {#if viewState?.actionError}
    <ErrorState data={{ title: 'Não consegui salvar', message: viewState.actionError }} />
  {/if}

  <div class="flex flex-wrap items-center gap-2">
    <StatusBadge
      data={{ label: healthStatusLabel(computer.healthStatus) }}
      ui={{ tone: healthStatusTone(computer.healthStatus) }}
    />
    {#if computer.isArchived}
      <StatusBadge data={{ label: 'Arquivada' }} ui={{ tone: 'neutral' }} />
    {/if}
    {#if computer.isBlocked}
      <StatusBadge data={{ label: 'Bloqueada' }} ui={{ tone: 'danger' }} />
    {/if}
    {#if computer.isOnline}
      <StatusBadge data={{ label: 'Online' }} ui={{ tone: 'success' }} />
    {:else}
      <StatusBadge data={{ label: 'Offline' }} ui={{ tone: 'neutral' }} />
    {/if}
    <span class="text-ink-500 text-xs">
      Vista {formatTimeAgo(computer.lastSeenAt)}
      {#if computer.lastSeenAt}
        · {formatDateTime(computer.lastSeenAt)}
      {/if}
    </span>
  </div>

  {#if computer.isBlocked && computer.blockReason}
    <p class="text-ink-700 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm">
      <span class="font-semibold">Motivo do bloqueio:</span>
      {computer.blockReason}
    </p>
  {/if}

  <StatCardGrid>
    <StatCard
      data={{ label: 'Nota de saúde', value: `${computer.healthScore}/100` }}
      ui={{ tone: CARD_TONES[computer.healthStatus] }}
    />
    <StatCard
      data={{ label: 'Processador agora', value: formatPercent(lastSample?.cpuPercent ?? null) }}
      ui={{ tone: 'info' }}
      state={{ isLoading: viewState?.isSamplesLoading }}
    />
    <StatCard
      data={{ label: 'Memória agora', value: formatPercent(lastSample?.memoryPercent ?? null) }}
      ui={{ tone: 'info' }}
      state={{ isLoading: viewState?.isSamplesLoading }}
    />
    <StatCard
      data={{ label: 'Disco agora', value: formatPercent(lastSample?.diskPercent ?? null) }}
      ui={{ tone: 'brand' }}
      state={{ isLoading: viewState?.isSamplesLoading }}
    />
  </StatCardGrid>

  <!-- O que baixou a nota vem antes de tudo: é a razão de alguém abrir esta tela. -->
  <section class="bg-card rounded-xl border p-4">
    <h2 class="text-ink-900 mb-2 text-sm font-semibold">O que precisa de atenção</h2>
    {#if computer.warnings.length === 0}
      <p class="text-ink-500 text-sm">
        Nada apontado nesta máquina. O agente avisa aqui assim que algo passar do limite.
      </p>
    {:else}
      <ul class="flex flex-col gap-2">
        {#each computer.warnings as warning, index (index)}
          <li class="flex items-start gap-2 text-sm">
            <StatusBadge
              data={{ label: warning.severity === 'critical' ? 'Crítico' : 'Atenção' }}
              ui={{ tone: warning.severity === 'critical' ? 'danger' : 'warning', size: 'sm' }}
            />
            <span class="text-ink-700 break-words">{warning.message}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="bg-card rounded-xl border p-4">
    <h2 class="text-ink-900 mb-3 text-sm font-semibold">Uso das últimas 24 horas</h2>
    <UsageChart
      data={{ points }}
      state={{ isLoading: viewState?.isSamplesLoading }}
      ui={{ emptyLabel: 'Esta máquina ainda não enviou nenhuma leitura.' }}
    />
  </section>

  <section class="bg-card rounded-xl border p-4">
    <h2 class="text-ink-900 mb-3 text-sm font-semibold">O que tem dentro</h2>
    <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each facts as fact (fact.label)}
        <div class="min-w-0">
          <dt class="text-ink-500 text-xs">{fact.label}</dt>
          <dd class="text-ink-900 text-sm break-words">{fact.value}</dd>
        </div>
      {/each}
    </dl>
  </section>

  <section class="bg-card rounded-xl border p-4">
    <h2 class="text-ink-900 mb-3 text-sm font-semibold">Alertas</h2>
    {#if viewState?.isAlertsLoading}
      <p class="text-ink-500 py-6 text-center text-sm">Carregando os alertas…</p>
    {:else if data.alerts.length === 0}
      <p class="text-ink-500 text-sm">
        Nenhum alerta registrado. Um alerta abre quando a medida passa do limite e fecha quando
        ela volta ao normal.
      </p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full min-w-[620px] text-left text-sm">
          <thead class="text-ink-500 border-b text-xs uppercase">
            <tr>
              <th scope="col" class="py-2 pr-3">Medida</th>
              <th scope="col" class="py-2 pr-3">Pico</th>
              <th scope="col" class="py-2 pr-3">Começou</th>
              <th scope="col" class="py-2 pr-3">Durou</th>
              <th scope="col" class="py-2">Causa provável</th>
            </tr>
          </thead>
          <tbody>
            {#each data.alerts as alert (alert.id)}
              <tr class="border-b last:border-0">
                <td class="text-ink-900 py-2 pr-3">{metricLabel(alert.metric)}</td>
                <td class="text-ink-700 py-2 pr-3 tabular-nums">
                  {formatPercent(alert.peakValue)}
                </td>
                <td class="text-ink-500 py-2 pr-3 whitespace-nowrap">
                  {formatDateTime(alert.startedAt)}
                </td>
                <td class="py-2 pr-3">
                  {#if alert.recoveredAt}
                    <span class="text-ink-700">{alertDurationLabel(alert)}</span>
                  {:else}
                    <StatusBadge
                      data={{ label: 'Acontecendo agora' }}
                      ui={{ tone: 'danger', size: 'sm' }}
                    />
                  {/if}
                </td>
                <td class="text-ink-500 py-2 break-words">{alert.causeProcess ?? '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <section class="bg-card rounded-xl border p-4">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-ink-900 text-sm font-semibold">Manutenções desta máquina</h2>
      <ActionButton
        data={{ label: 'Registrar manutenção' }}
        ui={{ variant: 'secondary', size: 'sm', icon: Wrench }}
        actions={{ onClick: actions.onRegisterMaintenance }}
      />
    </div>

    {#if viewState?.isMaintenancesLoading}
      <p class="text-ink-500 py-6 text-center text-sm">Carregando o histórico…</p>
    {:else if data.maintenances.length === 0}
      <p class="text-ink-500 text-sm">
        Nada registrado ainda. É por este histórico que se enxerga quando vale trocar a máquina
        em vez de remendar.
      </p>
    {:else}
      <ul class="flex flex-col divide-y">
        {#each data.maintenances as maintenance (maintenance.id)}
          <li class="flex flex-wrap items-start justify-between gap-2 py-2">
            <div class="min-w-0">
              <p class="text-ink-900 text-sm break-words">{maintenance.description ?? '—'}</p>
              <p class="text-ink-500 text-xs">
                {formatDateTime(maintenance.performedAt)}
                {#if maintenance.performedBy}
                  · {maintenance.performedBy}
                {/if}
              </p>
            </div>
            <StatusBadge
              data={{ label: maintenanceTypeLabel(maintenance.type) }}
              ui={{ tone: maintenanceTypeTone(maintenance.type), size: 'sm' }}
            />
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="bg-card rounded-xl border p-4">
    <h2 class="text-ink-900 mb-3 text-sm font-semibold">Peças que esta máquina recebeu</h2>

    {#if viewState?.isPartsLoading}
      <p class="text-ink-500 py-6 text-center text-sm">Carregando as peças…</p>
    {:else if data.partMovements.length === 0}
      <p class="text-ink-500 text-sm">
        Nenhuma peça do depósito foi ligada a esta máquina. Ao dar baixa numa peça, escolha a
        máquina e ela aparece aqui.
      </p>
    {:else}
      <ul class="flex flex-col divide-y">
        {#each data.partMovements as movement (movement.id)}
          <li class="flex flex-wrap items-start justify-between gap-2 py-2">
            <div class="min-w-0">
              <p class="text-ink-900 text-sm break-words">{movement.partName}</p>
              <p class="text-ink-500 text-xs">
                {formatDateTime(movement.createdAt)}
                {#if movement.handledBy}
                  · {movement.handledBy}
                {/if}
                {#if movement.note}
                  · {movement.note}
                {/if}
              </p>
            </div>
            <StatusBadge
              data={{ label: `${movementTypeLabel(movement.type)} · ${movement.quantity}` }}
              ui={{ tone: movementTypeTone(movement.type), size: 'sm' }}
            />
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<ConfirmDialog
  data={{
    title: 'Arquivar esta máquina?',
    description: `${computer.name} sai das listas do dia a dia, mas nada é apagado: o histórico dela continua aqui e ela pode voltar quando quiser.`,
    confirmLabel: 'Arquivar',
    confirmingLabel: 'Arquivando…',
  }}
  ui={{ tone: 'danger' }}
  state={{ isOpen: pending === 'archive', isConfirming: viewState?.isSaving }}
  actions={{ onConfirm: confirmPending, onCancel: () => (pending = null) }}
/>

<ConfirmDialog
  data={{
    title: 'Tirar esta máquina do arquivo?',
    description: `${computer.name} volta a aparecer nas listas do dia a dia.`,
    confirmLabel: 'Tirar do arquivo',
    confirmingLabel: 'Salvando…',
  }}
  state={{ isOpen: pending === 'unarchive', isConfirming: viewState?.isSaving }}
  actions={{ onConfirm: confirmPending, onCancel: () => (pending = null) }}
/>

<ConfirmDialog
  data={{
    title: 'Desbloquear esta máquina?',
    description: `O agente de ${computer.name} volta a ser aceito na próxima tentativa de conexão, e a máquina volta a enviar leituras.`,
    confirmLabel: 'Desbloquear',
    confirmingLabel: 'Salvando…',
  }}
  state={{ isOpen: pending === 'unblock', isConfirming: viewState?.isSaving }}
  actions={{ onConfirm: confirmPending, onCancel: () => (pending = null) }}
/>

<ConfirmDialog
  data={{
    title: 'Gerar um token novo?',
    description: `O token atual para de funcionar na hora, e o agente instalado em ${computer.name} vai parar de enviar até ser reconfigurado com o código novo.`,
    confirmLabel: 'Gerar token novo',
    confirmingLabel: 'Gerando…',
  }}
  ui={{ tone: 'danger' }}
  state={{ isOpen: pending === 'token', isConfirming: viewState?.isSaving }}
  actions={{ onConfirm: confirmPending, onCancel: () => (pending = null) }}
/>

<ComputerBlockDialog
  data={{ computerName: computer.name }}
  state={{ isOpen: pending === 'block', isConfirming: viewState?.isSaving }}
  actions={{
    onConfirm: (reason: string) => {
      actions.onBlockedChange(true, reason);
      pending = null;
    },
    onCancel: () => (pending = null),
  }}
/>
