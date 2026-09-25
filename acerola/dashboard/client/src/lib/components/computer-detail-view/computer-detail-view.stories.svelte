<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import {
    type Computer,
    type ComputerAlert,
    type ComputerSample,
  } from '@template/shared/schemas/computer.schema';

  import { type Maintenance } from '@template/shared/schemas/maintenance.schema';

  import ComputerDetailView from './computer-detail-view.svelte';

  const GB = 1024 ** 3;

  function computer(over: Partial<Computer> = {}): Computer {
    return {
      id: 3,
      name: 'CONTABIL-03',
      displayName: 'Contábil — mesa do fechamento',
      responsibleName: 'Daniela Prado',
      department: 'contabil',
      hardware: {
        os: 'Microsoft Windows 11 Pro',
        platform: 'windows',
        platformVersion: '10.0.26100',
        kernelVersion: '10.0.26100',
        arch: 'amd64',
        cpuModel: 'AMD Ryzen 5 5600G',
        logicalCpus: 12,
        physicalCpus: 6,
        totalMemoryBytes: 8 * GB,
        macAddress: '00:00:5E:00:53:03',
        localIp: '198.51.100.13',
        totalDiskBytes: 500 * GB,
        freeDiskBytes: 14 * GB,
        uptimeSeconds: 47 * 24 * 60 * 60,
        bootTime: '2026-08-07T09:00:00.000Z',
      },
      healthScore: 63,
      healthStatus: 'critical',
      warnings: [
        { severity: 'critical', message: 'Disco quase cheio: só 2,8% livre' },
        {
          severity: 'attention',
          message: 'Ligada há 47 dias sem reiniciar — pode haver atualização pendente',
        },
      ],
      isOnline: true,
      lastSeenAt: new Date(Date.now() - 60 * 1000).toISOString(),
      agentVersion: '1.0.0',
      isArchived: false,
      isBlocked: false,
      blockReason: null,
      disposedAt: null,
      disposalType: null,
      disposalReason: null,
      createdAt: '2026-05-01T12:00:00.000Z',
      createdBy: 'suporte@azuos.local',
      updatedAt: null,
      updatedBy: null,
      ...over,
    };
  }

  /** Cadastrada e agente nunca instalado: tudo em branco, de propósito. */
  const pendingAgent = computer({
    id: 4,
    name: 'FISCAL-04',
    displayName: 'Fiscal — máquina nova, agente pendente',
    responsibleName: 'Eduardo Lima',
    department: 'fiscal',
    healthScore: 100,
    healthStatus: 'good',
    warnings: [],
    isOnline: false,
    lastSeenAt: null,
    agentVersion: null,
    hardware: {
      os: null,
      platform: null,
      platformVersion: null,
      kernelVersion: null,
      arch: null,
      cpuModel: null,
      logicalCpus: null,
      physicalCpus: null,
      totalMemoryBytes: null,
      macAddress: null,
      localIp: null,
      totalDiskBytes: null,
      freeDiskBytes: null,
      uptimeSeconds: null,
      bootTime: null,
    },
  });

  const START = Date.now() - 24 * 60 * 60 * 1000;
  const FIVE_MINUTES = 5 * 60 * 1000;

  const samples: ComputerSample[] = Array.from({ length: 288 }, (_, index) => {
    const wave = Math.sin(index / 18) * 12;
    const isSpike = index >= 250 && index < 258;

    return {
      sampledAt: new Date(START + index * FIVE_MINUTES).toISOString(),
      cpuPercent: isSpike ? 99 : 35 + wave,
      memoryPercent: isSpike ? 99 : 71 + wave / 2,
      diskPercent: 97,
      networkBytesPerSec: 120000,
    };
  });

  const alerts: ComputerAlert[] = [
    {
      id: 1,
      computerId: 3,
      metric: 'disk',
      peakValue: 97.2,
      threshold: 90,
      status: 'active',
      startedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      recoveredAt: null,
      causeProcess: 'OneDrive.exe',
    },
    {
      id: 2,
      computerId: 3,
      metric: 'cpu',
      peakValue: 99.4,
      threshold: 98,
      status: 'recovered',
      startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      recoveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      causeProcess: 'excel.exe',
    },
  ];

  const maintenances: Maintenance[] = [
    {
      id: 1,
      computerId: 3,
      computerName: 'CONTABIL-03',
      computerDisplayName: 'Contábil — mesa do fechamento',
      computerDepartment: 'contabil',
      otherMachine: null,
      type: 'corrective',
      description: 'Máquina desligando sozinha: cooler do processador substituído.',
      performedBy: 'Carlos (assistência externa)',
      performedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'suporte@azuos.local',
      updatedAt: null,
      updatedBy: null,
    },
  ];

  const transfers = [
    {
      id: 1,
      computerId: 2,
      fromDepartment: 'recepcao' as const,
      toDepartment: 'financeiro' as const,
      responsible: 'Coordenação financeira',
      note: 'Passou para o financeiro quando a recepção recebeu a máquina nova.',
      peripheralsLeftBehind: 1,
      createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'suporte@azuos.local',
    },
  ];

  const actions = {
    onEdit: () => {},
    onRegisterMaintenance: () => {},
    onTransfer: () => {},
    onArchivedChange: () => {},
    onBlockedChange: () => {},
    onRegenerateToken: () => {},
    onDispose: () => {},
    onRestore: () => {},
    onBack: () => {},
  };

  const { Story } = defineMeta({
    title: 'Components/ComputerDetailView',
    component: ComputerDetailView,
  });
</script>

<!-- A máquina com problema: é para ela que esta tela existe. -->
<Story name="Default" args={{ data: { computer: computer(), samples, alerts, maintenances, partMovements: [], transfers }, actions }} />

<!-- Máquina saudável: nada apontado, e o texto diz isso em vez de ficar em branco. -->
<Story
  name="Healthy"
  args={{
    data: {
      computer: computer({
        id: 1,
        name: 'RECEPCAO-01',
        displayName: 'Recepção — balcão',
        responsibleName: 'Bia Costa',
        department: 'recepcao',
        healthScore: 100,
        healthStatus: 'good',
        warnings: [],
      }),
      samples,
      alerts: [],
      maintenances: [],
      partMovements: [],
      transfers: [],
    },
    actions,
  }}
/>

<Story
  name="Loading"
  args={{
    data: { computer: computer(), samples: [], alerts: [], maintenances: [], partMovements: [], transfers },
    state: { isSamplesLoading: true, isAlertsLoading: true },
    actions,
  }}
/>

<!-- CASO LIMITE: cadastrada e nunca vista. A ficha diz "ainda não sei", e não zeros. -->
<Story
  name="Agent never connected"
  args={{ data: { computer: pendingAgent, samples: [], alerts: [], maintenances: [], partMovements: [], transfers }, actions }}
/>

<Story
  name="Blocked"
  args={{
    data: {
      computer: computer({
        isBlocked: true,
        isOnline: false,
        blockReason: 'Máquina emprestada devolvida ao fornecedor; parou de ser monitorada.',
      }),
      samples,
      alerts,
      maintenances,
      partMovements: [],
      transfers: [],
    },
    actions,
  }}
/>

<Story
  name="Archived"
  args={{
    data: { computer: computer({ isArchived: true, isOnline: false }), samples, alerts, maintenances, partMovements: [], transfers },
    actions,
  }}
/>

<!-- Falha de gravação: fica na tela, em vermelho, com o motivo (CONTRIBUTING §15). -->
<Story
  name="Action error"
  args={{
    data: { computer: computer(), samples, alerts, maintenances, partMovements: [], transfers },
    state: { actionError: 'Você não tem permissão para alterar o cadastro.' },
    actions,
  }}
/>
