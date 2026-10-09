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
    disposalTypeLabel,
    disposalTypeTone,
    isDisposed,
  } from '@template/shared/domain/disposal.util';
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
  import { movementTypeLabel, movementTypeTone } from '@template/shared/domain/part-catalog.util';
  import { type PartMovement } from '@template/shared/schemas/part.schema';
  import { type Transfer } from '@template/shared/schemas/transfer.schema';

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
  export type AcerolaComputerDetailViewProps = {
    data: {
      computer: Computer;
      samples: ComputerSample[];
      alerts: ComputerAlert[];
      /**
       * ONDE a pessoa está em cada lista longa, e QUANTOS itens existem ao todo.
       *
       * As duas listas são paginadas no SERVIDOR: uma máquina que dá trabalho acumula
       * centenas de episódios, e a tela nunca corta nada por conta própria.
       */
      alertPaging: ListPaging;
      ticketPaging: ListPaging;
      /** O que está acontecendo na máquina agora. Nulo enquanto ela nunca tiver enviado nada. */
      live: ComputerLive | null;
      /** O que já foi feito nesta máquina. Vem da feature de Manutenção; a ficha só lê. */
      maintenances: Maintenance[];
      /** Os chamados que apontam para esta máquina. A ficha só lê; quem vincula é quem atende. */
      tickets: Ticket[];
      /** As peças que saíram do depósito para esta máquina. A ficha também só lê. */
      partMovements: PartMovement[];
      /** Por onde a máquina já andou. A transferência é escrita pelo diálogo, não por aqui. */
      transfers: Transfer[];
    };
    state?: {
      isSamplesLoading?: boolean;
      isAlertsLoading?: boolean;
      isLiveLoading?: boolean;
      isMaintenancesLoading?: boolean;
      isTicketsLoading?: boolean;
      isPartsLoading?: boolean;
      isTransfersLoading?: boolean;
      isSaving?: boolean;
      actionError?: string | null;
    };
    actions: {
      onEdit: () => void;
      /** Abre o formulário de manutenção já com esta máquina escolhida. */
      onRegisterMaintenance: () => void;
      /** Abre o diálogo de mudar a máquina de departamento. */
      onTransfer: () => void;
      onArchivedChange: (isArchived: boolean) => void;
      onBlockedChange: (isBlocked: boolean, reason?: string) => void;
      onRegenerateToken: () => void;
      onDispose: (input: { type: 'defect' | 'scrap'; reason: string }) => void;
      onRestore: () => void;
      onBack: () => void;
      /** Trocar de página vai BUSCAR no servidor — a tela não corta a lista por conta própria. */
      onAlertPageChange: (page: number) => void;
      onTicketPageChange: (page: number) => void;
    };
  };

  import { type ComputerLive } from '@template/shared/schemas/computer-live.schema';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';
  import { ticketProblemTypeLabel } from '@template/shared/domain/ticket-catalog.util';
  import { ticketStatusLabel, ticketStatusTone } from '@template/shared/domain/ticket-status.util';

  /** Onde a pessoa está numa lista paginada, e de que tamanho é a lista inteira. */
  export type ListPaging = { page: number; pageSize: number; total: number };

  export type HardwareFact = { label: string; value: string };

  /**
   * Uma mudança de departamento em uma linha: "Recepção → Contábil".
   *
   * Os dois lados aparecem sempre, inclusive a prateleira: "saiu do nada para o fiscal" não
   * é uma frase que alguém entenda, e "Sem departamento → Fiscal" é.
   */
  export function transferRouteOf(transfer: Transfer): string {
    return `${placeLabelOf(transfer.fromDepartment)} → ${placeLabelOf(transfer.toDepartment)}`;
  }

  function placeLabelOf(department: string | null): string {
    return department ? departmentLabel(department as never) : 'Sem departamento';
  }

  /**
   * O NÚMERO DE AGORA — e o que fazer quando não há "agora".
   *
   * Havia um defeito aqui, e ele era do pior tipo: os cartões do alto liam a última AMOSTRA
   * gravada (um resumo periódico, de minutos atrás) e diziam "agora" em cima dela. O painel
   * ao vivo, logo abaixo, mostrava a leitura do segundo — e os dois números não batiam.
   * "Processador agora 100%" com "Processador — 37% no total" um centímetro abaixo.
   *
   * Então: a leitura AO VIVO manda, sempre que existe. Sem ela — agente desligado, máquina
   * fora do ar — sobra a última amostra, e aí o rótulo PARA de dizer "agora": passa a dizer
   * "na última leitura", porque é isso que é.
   */
  export type NowReading = {
    cpuPercent: number | null;
    memoryPercent: number | null;
    diskPercent: number | null;
    /** Verdadeiro quando o número é do segundo, e não um retrato guardado. */
    isLive: boolean;
  };

  export function nowReadingOf(
    live: ComputerLive | null,
    lastSample: ComputerSample | null,
  ): NowReading {
    if (live) {
      return {
        cpuPercent: live.cpu.percentTotal,
        memoryPercent: live.memory.usedPercent,
        diskPercent: totalDiskPercentOf(live.disks),
        isLive: true,
      };
    }

    return {
      cpuPercent: lastSample?.cpuPercent ?? null,
      memoryPercent: lastSample?.memoryPercent ?? null,
      diskPercent: lastSample?.diskPercent ?? null,
      isLive: false,
    };
  }

  /**
   * O disco do PARQUE DA MÁQUINA, somando os volumes — a mesma conta da amostra guardada.
   *
   * Somar, e não pegar o pior volume: é assim que o servidor calcula a amostra
   * (`computers.mapper`), e duas contas diferentes para o mesmo cartão fariam o número pular
   * ao agente cair, sem nada ter mudado na máquina.
   */
  export function totalDiskPercentOf(disks: ComputerLive['disks']): number | null {
    const total = disks.reduce((sum, disk) => sum + disk.totalBytes, 0);
    if (total === 0) return null;

    const used = disks.reduce((sum, disk) => sum + disk.usedBytes, 0);

    return (used / total) * 100;
  }

  /**
   * OS NÚCLEOS: os físicos e os lógicos, os dois.
   *
   * Só o lógico engana na hora de comprar e na hora de culpar a máquina: um i5 de 6 núcleos
   * com hyper-threading aparece como 12, e quem lê "12 núcleos" acha que a máquina é o dobro
   * do que é. Físico é quanto de silício existe; lógico é quantas filas o sistema enxerga.
   *
   * O agente pode informar um e não o outro (versão antiga, ou máquina virtual que esconde o
   * físico), e aí a tela diz o que sabe em vez de inventar o que falta.
   */
  export function coreCountOf(physical: number | null, logical: number | null): string {
    if (physical && logical) return `${physical} físicos · ${logical} lógicos`;
    if (physical) return `${physical} físicos`;
    if (logical) return `${logical} lógicos`;

    return '—';
  }

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
      { label: 'Núcleos', value: coreCountOf(hardware.physicalCpus, hardware.logicalCpus) },
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
  import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
  import KeyRound from '@lucide/svelte/icons/key-round';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Undo2 from '@lucide/svelte/icons/undo-2';
  import Wrench from '@lucide/svelte/icons/wrench';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ConfirmDialog from '$lib/components/acerola-confirm-dialog/acerola-confirm-dialog.svelte';
  import ComputerLivePanel from '../acerola-computer-live-panel/acerola-computer-live-panel.svelte';
  import ComputerProcessTable from '../acerola-computer-process-table/acerola-computer-process-table.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import PageHeader from '$lib/components/acerola-page-header/acerola-page-header.svelte';
  import PaginationBar from '$lib/components/acerola-pagination-bar/acerola-pagination-bar.svelte';
  import StatCard from '$lib/components/acerola-stat-card/acerola-stat-card.svelte';
  import StatCardGrid from '$lib/components/acerola-stat-card-grid/acerola-stat-card-grid.svelte';
  import StatusBadge from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';
  import TableViewToggle from '$lib/components/acerola-table-view-toggle/acerola-table-view-toggle.svelte';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/acerola-table/acerola-table';
  import UsageChart from '../acerola-usage-chart/acerola-usage-chart.svelte';
  import ComputerBlockDialog from '../acerola-computer-block-dialog/acerola-computer-block-dialog.svelte';
  import ComputerDisposalDialog from '../acerola-computer-disposal-dialog/acerola-computer-disposal-dialog.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { fillColorOf, fillFromPointer } from '$lib/motion/hover-fill';
  import { cn } from '$lib/utils/cn';
  import { formatDateTime } from '$lib/utils/format-date';
  import { formatPercent, formatTimeAgo } from '$lib/utils/format-machine';

  /* O prop precisa de outro nome aqui dentro: um binding local chamado `state` faz o
     compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune. */
  let { data, state: viewState, actions }: AcerolaComputerDetailViewProps = $props();

  const tableView = useTableViewModel();

  const computer = $derived(data.computer);
  const facts = $derived(hardwareFacts(computer));
  const lastSample = $derived(data.samples.at(-1) ?? null);
  const live = $derived(data.live);

  /* Os cartões do alto leem daqui, e não da última amostra: ver `nowReadingOf`. */
  const now = $derived(nowReadingOf(live, lastSample));
  const nowSuffix = $derived(now.isLive ? 'agora' : 'na última leitura');

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
  let pending = $state<
    'archive' | 'unarchive' | 'unblock' | 'token' | 'block' | 'dispose' | 'restore' | null
  >(null);

  /* Máquina descartada é SÓ LEITURA: editar, bloquear ou gerar token nela seria mexer no
     passado — o cadastro precisa continuar contando o que ela era quando saiu. */
  const disposed = $derived(isDisposed(computer));

  function confirmPending(): void {
    if (pending === 'archive') actions.onArchivedChange(true);
    if (pending === 'unarchive') actions.onArchivedChange(false);
    if (pending === 'unblock') actions.onBlockedChange(false);
    if (pending === 'token') actions.onRegenerateToken();
    if (pending === 'restore') actions.onRestore();

    pending = null;
  }
</script>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-5">
  <ActionButton
    data={{ label: 'Voltar ao inventário' }}
    ui={{ variant: 'ghost', size: 'sm', icon: ArrowLeft, className: 'self-start' }}
    actions={{ onClick: actions.onBack }}
  />

  <PageHeader
    data={{
      title: computer.displayName?.trim() || computer.hardware.hostname?.trim() || computer.name,
      description: `${computer.hardware.hostname?.trim() || computer.name} · ${computer.department ? departmentLabel(computer.department) : 'Sem departamento'} · ${computer.responsibleName ?? 'Sem responsável'}`,
    }}
  >
    {#if disposed}
      <ActionButton
        data={{ label: 'Voltar ao inventário' }}
        ui={{ variant: 'secondary', icon: Undo2 }}
        state={{ isDisabled: viewState?.isSaving }}
        actions={{ onClick: () => (pending = 'restore') }}
      />
    {:else}
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
      <!-- Transferir só faz sentido para máquina em uso: arquivada e descartada não estão na
           mesa de ninguém para mudar de sala. -->
      {#if !computer.isArchived}
        <ActionButton
          data={{ label: 'Transferir' }}
          ui={{ variant: 'secondary', icon: ArrowLeftRight }}
          state={{ isDisabled: viewState?.isSaving }}
          actions={{ onClick: actions.onTransfer }}
        />
      {/if}
    {/if}
    {#if disposed}
      <!-- Descartada: nada de bloquear nem arquivar. A única ação é desfazer. -->
    {:else if computer.isBlocked}
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
    {#if disposed}
      <!-- Já saiu de uso: arquivar não teria o que fazer. -->
    {:else if computer.isArchived}
      <ActionButton
        data={{ label: 'Tirar do arquivo' }}
        ui={{ variant: 'secondary' }}
        state={{ isDisabled: viewState?.isSaving }}
        actions={{ onClick: () => (pending = 'unarchive') }}
      />
    {:else}
      <ActionButton
        data={{ label: 'Arquivar' }}
        ui={{ variant: 'secondary' }}
        state={{ isDisabled: viewState?.isSaving }}
        actions={{ onClick: () => (pending = 'archive') }}
      />
      <!-- Descartar é a decisão pesada: sai de uso de vez, com motivo. Arquivar é a leve. -->
      <ActionButton
        data={{ label: 'Descartar' }}
        ui={{ variant: 'danger', icon: Trash2 }}
        state={{ isDisabled: viewState?.isSaving }}
        actions={{ onClick: () => (pending = 'dispose') }}
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
    {#if disposed && computer.disposalType}
      <StatusBadge
        data={{ label: `Descartada · ${disposalTypeLabel(computer.disposalType)}` }}
        ui={{ tone: disposalTypeTone(computer.disposalType) }}
      />
    {/if}
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

  {#if disposed && computer.disposalType}
    <p class="text-ink-700 bg-muted rounded-box border px-3 py-2 text-sm">
      <span class="font-semibold">
        Fora de uso ({disposalTypeLabel(computer.disposalType)}) desde
        {formatDateTime(computer.disposedAt)}:
      </span>
      {computer.disposalReason}
    </p>
  {/if}

  {#if computer.isBlocked && computer.blockReason}
    <p
      class="text-ink-700 rounded-box border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm"
    >
      <span class="font-semibold">Motivo do bloqueio:</span>
      {computer.blockReason}
    </p>
  {/if}

  <StatCardGrid>
    <StatCard
      data={{ label: 'Nota de saúde', value: `${computer.healthScore}/100` }}
      ui={{ tone: CARD_TONES[computer.healthStatus] }}
    />
    <!-- O rótulo muda junto com a origem do número: com o agente ligado é "agora"; com ele
         fora do ar vira "na última leitura", porque é o que o número é. Um cartão que diz
         "agora" em cima de um retrato de minutos atrás faz decidir errado. -->
    <StatCard
      data={{ label: `Processador ${nowSuffix}`, value: formatPercent(now.cpuPercent) }}
      ui={{ tone: 'info' }}
      state={{ isLoading: viewState?.isSamplesLoading }}
    />
    <StatCard
      data={{ label: `Memória ${nowSuffix}`, value: formatPercent(now.memoryPercent) }}
      ui={{ tone: 'info' }}
      state={{ isLoading: viewState?.isSamplesLoading }}
    />
    <StatCard
      data={{ label: `Disco ${nowSuffix}`, value: formatPercent(now.diskPercent) }}
      ui={{ tone: 'brand' }}
      state={{ isLoading: viewState?.isSamplesLoading }}
    />
  </StatCardGrid>

  <!-- O que baixou a nota vem antes de tudo: é a razão de alguém abrir esta tela. -->
  <section class="bg-card rounded-surface border p-4">
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

  <section class="bg-card rounded-surface border p-4">
    <div class="mb-3 flex items-baseline justify-between gap-3">
      <h2 class="text-ink-900 text-sm font-semibold">O que está acontecendo agora</h2>
      {#if live}
        <span class="text-ink-500 shrink-0 text-xs">Lido {formatTimeAgo(live.receivedAt)}</span>
      {/if}
    </div>
    <ComputerLivePanel data={{ live }} state={{ isLoading: viewState?.isLiveLoading }} />
  </section>

  <section class="bg-card rounded-surface border p-4">
    <h2 class="text-ink-900 mb-3 text-sm font-semibold">Aplicativos que mais pesam</h2>
    <ComputerProcessTable
      data={{ processes: live?.processes ?? [] }}
      state={{ isLoading: viewState?.isLiveLoading }}
    />
  </section>

  <section class="bg-card rounded-surface border p-4">
    <h2 class="text-ink-900 mb-3 text-sm font-semibold">Uso das últimas 24 horas</h2>
    <UsageChart
      data={{ points }}
      state={{ isLoading: viewState?.isSamplesLoading }}
      ui={{ emptyLabel: 'Esta máquina ainda não enviou nenhuma leitura.' }}
    />
  </section>

  <section class="bg-card rounded-surface border p-4">
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

  <section class="bg-card rounded-surface border p-4">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-ink-900 text-sm font-semibold">Alertas</h2>
      {#if data.alerts.length > 0}
        <TableViewToggle />
      {/if}
    </div>
    {#if viewState?.isAlertsLoading}
      <p class="text-ink-500 py-6 text-center text-sm">Carregando os alertas…</p>
    {:else if data.alerts.length === 0}
      <p class="text-ink-500 text-sm">
        Nenhum alerta registrado. Um alerta abre quando a medida passa do limite e fecha quando ela
        volta ao normal.
      </p>
    {:else}
      <!-- Lista de cartões para mobile (< xl) -->
      <div
        class={cn('card-grid', !tableView.forceCards && 'xl:hidden')}
        data-slot="alert-cards-mobile"
      >
        {#each data.alerts as alert (alert.id)}
          <!-- A cor da situação entra por onde o mouse entrou (`hover-fill`, em tokens.css). -->
          <div
            use:fillFromPointer
            style:--fill-color={fillColorOf(alert.recoveredAt ? 'neutral' : 'danger')}
            class="hover-fill border-border/70 bg-card rounded-surface border p-3 shadow-xs"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="font-medium text-ink-900 text-sm">
                {metricLabel(alert.metric)}
              </span>
              {#if alert.recoveredAt}
                <span class="text-ink-700 text-xs">{alertDurationLabel(alert)}</span>
              {:else}
                <StatusBadge
                  data={{ label: 'Acontecendo agora' }}
                  ui={{ tone: 'danger', size: 'sm' }}
                />
              {/if}
            </div>

            <div class="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="text-muted-foreground block text-xs">Pico</span>
                <span class="tabular-nums font-medium text-ink-700">
                  {formatPercent(alert.peakValue)}
                </span>
              </div>
              <div>
                <span class="text-muted-foreground block text-xs">Começou</span>
                <span class="text-ink-500">{formatDateTime(alert.startedAt)}</span>
              </div>
            </div>

            {#if alert.causeProcess}
              <div class="border-border/60 mt-2 border-t pt-1.5 text-xs">
                <span class="text-muted-foreground text-xs">Causa provável: </span>
                <span class="text-ink-700 font-mono text-xs break-words">{alert.causeProcess}</span>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Tabela para desktop (>= xl) -->
      <div
        class={cn('overflow-x-auto', tableView.forceCards ? 'hidden' : 'hidden xl:block')}
        data-slot="alert-table-desktop"
      >
        <Table class="min-w-[620px]">
          <TableHeader>
            <TableRow>
              <TableHead>Medida</TableHead>
              <TableHead>Pico</TableHead>
              <TableHead>Começou</TableHead>
              <TableHead>Durou</TableHead>
              <TableHead>Causa provável</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each data.alerts as alert (alert.id)}
              <TableRow>
                <TableCell class="font-medium text-ink-900">{metricLabel(alert.metric)}</TableCell>
                <TableCell class="tabular-nums text-ink-700">
                  {formatPercent(alert.peakValue)}
                </TableCell>
                <TableCell class="text-ink-500 whitespace-nowrap text-xs">
                  {formatDateTime(alert.startedAt)}
                </TableCell>
                <TableCell>
                  {#if alert.recoveredAt}
                    <span class="text-ink-700 text-xs">{alertDurationLabel(alert)}</span>
                  {:else}
                    <StatusBadge
                      data={{ label: 'Acontecendo agora' }}
                      ui={{ tone: 'danger', size: 'sm' }}
                    />
                  {/if}
                </TableCell>
                <TableCell class="text-ink-500 break-words text-xs"
                  >{alert.causeProcess ?? '—'}</TableCell
                >
              </TableRow>
            {/each}
          </TableBody>
          {#snippet footer()}
            <span>Alertas automáticos gerados pelo agente</span>
          {/snippet}
        </Table>
      </div>

      <!-- A barra diz quantos episódios existem AO TODO, e não quantos vieram nesta página:
           sem isso a lista seria cortada em silêncio (CONTRIBUTING §15). Quem pagina é o
           servidor — ver `computersApi.alerts`. -->
      <PaginationBar
        data={{
          page: data.alertPaging.page,
          pageSize: data.alertPaging.pageSize,
          total: data.alertPaging.total,
          noun: ['alerta', 'alertas'],
        }}
        state={{ isLoading: viewState?.isAlertsLoading }}
        actions={{ onPageChange: actions.onAlertPageChange }}
      />
    {/if}
  </section>

  <section class="bg-card rounded-surface border p-4">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-ink-900 text-sm font-semibold">Manutenções desta máquina</h2>
      {#if !disposed}
        <ActionButton
          data={{ label: 'Registrar manutenção' }}
          ui={{ variant: 'secondary', size: 'sm', icon: Wrench }}
          actions={{ onClick: actions.onRegisterMaintenance }}
        />
      {/if}
    </div>

    {#if viewState?.isMaintenancesLoading}
      <p class="text-ink-500 py-6 text-center text-sm">Carregando o histórico…</p>
    {:else if data.maintenances.length === 0}
      <p class="text-ink-500 text-sm">
        Nada registrado ainda. É por este histórico que se enxerga quando vale trocar a máquina em
        vez de remendar.
      </p>
    {:else}
      <ul class="flex flex-col divide-y">
        {#each data.maintenances as maintenance (maintenance.id)}
          <li class="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div class="min-w-0 flex-1">
              <p class="text-ink-900 text-sm break-words leading-tight">
                {maintenance.description ?? '—'}
              </p>
              <p class="text-ink-500 text-xs mt-1 break-words leading-normal">
                {formatDateTime(maintenance.performedAt)}
                {#if maintenance.performedBy}
                  · {maintenance.performedBy}
                {/if}
              </p>
            </div>
            <div class="shrink-0 pt-0.5">
              <StatusBadge
                data={{ label: maintenanceTypeLabel(maintenance.type) }}
                ui={{ tone: maintenanceTypeTone(maintenance.type), size: 'sm' }}
              />
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="bg-card rounded-surface border p-4">
    <h2 class="text-ink-900 mb-3 text-sm font-semibold">Chamados desta máquina</h2>

    {#if viewState?.isTicketsLoading}
      <p class="text-ink-500 text-sm">Carregando os chamados…</p>
    {:else if data.tickets.length === 0}
      <p class="text-ink-500 text-sm">
        Nenhum chamado aponta para esta máquina. Quem atende é que faz esse vínculo, na tela de
        Chamados.
      </p>
    {:else}
      <ul class="divide-y">
        {#each data.tickets as ticket (ticket.id)}
          <li class="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div class="min-w-0 flex-1">
              <p class="text-ink-900 text-sm break-words leading-tight">
                <span class="font-mono text-xs">{ticket.protocol}</span>
                · {ticketProblemTypeLabel(ticket.problemType)}
              </p>
              <p class="text-ink-500 text-xs mt-1 break-words leading-normal">
                {ticket.requesterName} · {formatDateTime(ticket.createdAt)}
              </p>
            </div>

            <div class="shrink-0 pt-0.5">
              <StatusBadge
                data={{ label: ticketStatusLabel(ticket.status) }}
                ui={{ tone: ticketStatusTone(ticket.status), size: 'sm' }}
              />
            </div>
          </li>
        {/each}
      </ul>

      <PaginationBar
        data={{
          page: data.ticketPaging.page,
          pageSize: data.ticketPaging.pageSize,
          total: data.ticketPaging.total,
          noun: ['chamado', 'chamados'],
        }}
        state={{ isLoading: viewState?.isTicketsLoading }}
        actions={{ onPageChange: actions.onTicketPageChange }}
      />
    {/if}
  </section>

  <section class="bg-card rounded-surface border p-4">
    <h2 class="text-ink-900 mb-3 text-sm font-semibold">Por onde esta máquina andou</h2>

    {#if viewState?.isTransfersLoading}
      <p class="text-ink-500 py-6 text-center text-sm">Carregando o histórico…</p>
    {:else if data.transfers.length === 0}
      <p class="text-ink-500 text-sm">
        Nenhuma transferência registrada. Ao mudar a máquina de departamento pelo botão
        "Transferir", a mudança fica guardada aqui.
      </p>
    {:else}
      <ul class="flex flex-col divide-y">
        {#each data.transfers as transfer (transfer.id)}
          <li class="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div class="min-w-0 flex-1">
              <p class="text-ink-900 text-sm break-words leading-tight">
                {transferRouteOf(transfer)}
              </p>
              <p class="text-ink-500 text-xs mt-1 break-words leading-normal">
                {formatDateTime(transfer.createdAt)}
                {#if transfer.responsible}
                  · {transfer.responsible}
                {/if}
                {#if transfer.note}
                  · {transfer.note}
                {/if}
              </p>
            </div>
            {#if transfer.peripheralsLeftBehind > 0}
              <div class="shrink-0 pt-0.5">
                <StatusBadge
                  data={{ label: `${transfer.peripheralsLeftBehind} peça(s) ficaram` }}
                  ui={{ tone: 'neutral', size: 'sm' }}
                />
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="bg-card rounded-surface border p-4">
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
          <li class="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div class="min-w-0 flex-1">
              <p class="text-ink-900 text-sm break-words leading-tight">{movement.partName}</p>
              <p class="text-ink-500 text-xs mt-1 break-words leading-normal">
                {formatDateTime(movement.createdAt)}
                {#if movement.handledBy}
                  · {movement.handledBy}
                {/if}
                {#if movement.note}
                  · {movement.note}
                {/if}
              </p>
            </div>
            <div class="shrink-0 pt-0.5">
              <StatusBadge
                data={{ label: `${movementTypeLabel(movement.type)} · ${movement.quantity}` }}
                ui={{ tone: movementTypeTone(movement.type), size: 'sm' }}
              />
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<ConfirmDialog
  data={{
    title: 'Arquivar esta máquina?',
    description: `${computer.hardware.hostname?.trim() || computer.name} sai das listas do dia a dia, mas nada é apagado: o histórico dela continua aqui e ela pode voltar quando quiser.`,
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
    description: `${computer.hardware.hostname?.trim() || computer.name} volta a aparecer nas listas do dia a dia.`,
    confirmLabel: 'Tirar do arquivo',
    confirmingLabel: 'Salvando…',
  }}
  state={{ isOpen: pending === 'unarchive', isConfirming: viewState?.isSaving }}
  actions={{ onConfirm: confirmPending, onCancel: () => (pending = null) }}
/>

<ConfirmDialog
  data={{
    title: 'Desbloquear esta máquina?',
    description: `O agente de ${computer.hardware.hostname?.trim() || computer.name} volta a ser aceito na próxima tentativa de conexão, e a máquina volta a enviar leituras.`,
    confirmLabel: 'Desbloquear',
    confirmingLabel: 'Salvando…',
  }}
  state={{ isOpen: pending === 'unblock', isConfirming: viewState?.isSaving }}
  actions={{ onConfirm: confirmPending, onCancel: () => (pending = null) }}
/>

<ConfirmDialog
  data={{
    title: 'Gerar um token novo?',
    description: `O token atual para de funcionar na hora, e o agente instalado em ${computer.hardware.hostname?.trim() || computer.name} vai parar de enviar até ser reconfigurado com o código novo.`,
    confirmLabel: 'Gerar token novo',
    confirmingLabel: 'Gerando…',
  }}
  ui={{ tone: 'danger' }}
  state={{ isOpen: pending === 'token', isConfirming: viewState?.isSaving }}
  actions={{ onConfirm: confirmPending, onCancel: () => (pending = null) }}
/>

<ConfirmDialog
  data={{
    title: 'Devolver esta máquina ao inventário?',
    description: `${computer.hardware.hostname?.trim() || computer.name} volta para as listas do dia a dia, e o motivo do descarte é apagado. O histórico dela continua inteiro.`,
    confirmLabel: 'Voltar ao inventário',
    confirmingLabel: 'Devolvendo…',
  }}
  state={{ isOpen: pending === 'restore', isConfirming: viewState?.isSaving }}
  actions={{ onConfirm: confirmPending, onCancel: () => (pending = null) }}
/>

<ComputerDisposalDialog
  data={{ computerName: computer.hardware.hostname?.trim() || computer.name }}
  state={{ isOpen: pending === 'dispose', isConfirming: viewState?.isSaving }}
  actions={{
    onConfirm: (input) => {
      actions.onDispose(input);
      pending = null;
    },
    onCancel: () => (pending = null),
  }}
/>

<ComputerBlockDialog
  data={{ computerName: computer.hardware.hostname?.trim() || computer.name }}
  state={{ isOpen: pending === 'block', isConfirming: viewState?.isSaving }}
  actions={{
    onConfirm: (reason: string) => {
      actions.onBlockedChange(true, reason);
      pending = null;
    },
    onCancel: () => (pending = null),
  }}
/>
