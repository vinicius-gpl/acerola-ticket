import { type ComputerAlertInsert } from '../../../server/src/lib/db/schema/computer-alerts.schema';
import { type ComputerSampleInsert } from '../../../server/src/lib/db/schema/computer-samples.schema';
import { type ComputerInsert } from '../../../server/src/lib/db/schema/computers.schema';

/**
 * Os dados de teste do inventário. VERSIONADOS: toda máquina que rodar o seed vê isto.
 *
 * Máquinas INVENTADAS. Nome de colega, número de série, MAC ou IP de equipamento de verdade
 * não entram aqui — este arquivo vai para o git e fica no histórico para sempre. Os endereços
 * usam as faixas reservadas para documentação, que não existem em rede nenhuma.
 *
 * **O `tokenHash` é um texto fixo, e não o hash de um token que funcione.** O agente se
 * identifica pelo SHA-256 do token que apresenta; nenhum token gera estes valores, então
 * nenhuma máquina de teste pode ser usada para enviar telemetria de verdade. Para testar o
 * agente, cadastre uma máquina pela tela — é lá que nasce um token legítimo.
 */
const TI = 'suporte@azuos.local';

const GB = 1024 ** 3;

/**
 * As datas são RELATIVAS ao momento do seed, ao contrário das dos chamados.
 *
 * O gráfico da ficha é uma janela das últimas 24 horas e a lista mostra "visto há tanto
 * tempo". Com data fixa, o seed nasceria com o gráfico vazio e todas as máquinas sumidas há
 * meses — a tela pareceria quebrada no dia seguinte ao commit. Os `id` continuam fixos, que é
 * o que torna o seed idempotente: rodar de novo reescreve as mesmas linhas, sem duplicar.
 */
const NOW = Date.now();

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const minutesAgo = (minutes: number) => new Date(NOW - minutes * MINUTE);
const hoursAgo = (hours: number) => new Date(NOW - hours * HOUR);
const daysAgo = (days: number) => new Date(NOW - days * DAY);

/** O esqueleto comum: o que toda máquina cadastrada tem antes de qualquer medição. */
function base(id: number, name: string): ComputerInsert {
  return {
    id,
    name,
    tokenHash: `seed-token-hash-${String(id).padStart(2, '0')}`,
    createdAt: daysAgo(120),
    createdBy: TI,
  };
}

export const COMPUTERS_SEED: ComputerInsert[] = [
  /* Máquina saudável e recém-vista: o caso comum, e a referência para comparar as outras. */
  {
    ...base(1, 'RECEPCAO-01'),
    displayName: 'Recepção — balcão',
    responsibleName: 'Bia Costa',
    department: 'recepcao',
    os: 'Microsoft Windows 11 Pro',
    platform: 'windows',
    platformVersion: '10.0.26100',
    kernelVersion: '10.0.26100',
    arch: 'amd64',
    cpuModel: 'Intel Core i5-12400',
    logicalCpus: 12,
    physicalCpus: 6,
    totalMemoryBytes: 16 * GB,
    macAddress: '00:00:5E:00:53:01',
    localIp: '198.51.100.11',
    totalDiskBytes: 480 * GB,
    freeDiskBytes: 210 * GB,
    uptimeSeconds: 3 * 24 * 60 * 60,
    bootTime: daysAgo(3),
    healthScore: 100,
    healthStatus: 'good',
    warnings: [],
    lastSeenAt: minutesAgo(2),
    agentVersion: '1.0.0',
  },

  /* Pouca memória: o aviso mais comum do parque antigo, e o que mais gera chamado de lentidão. */
  {
    ...base(2, 'FINANCEIRO-02'),
    displayName: 'Financeiro — mesa 2',
    responsibleName: 'Carlos Menezes',
    department: 'financeiro',
    os: 'Microsoft Windows 10 Pro',
    platform: 'windows',
    platformVersion: '10.0.19045',
    kernelVersion: '10.0.19045',
    arch: 'amd64',
    cpuModel: 'Intel Core i3-9100',
    logicalCpus: 4,
    physicalCpus: 4,
    totalMemoryBytes: 4 * GB,
    macAddress: '00:00:5E:00:53:02',
    localIp: '198.51.100.12',
    totalDiskBytes: 240 * GB,
    freeDiskBytes: 60 * GB,
    uptimeSeconds: 2 * 24 * 60 * 60,
    bootTime: daysAgo(2),
    healthScore: 88,
    healthStatus: 'attention',
    warnings: [{ severity: 'attention', message: 'Memória RAM abaixo de 8 GB: 4,0 GB' }],
    lastSeenAt: minutesAgo(4),
    agentVersion: '1.0.0',
  },

  /* Disco quase cheio E ligada há meses: a máquina que a tela precisa colocar no topo. */
  {
    ...base(3, 'CONTABIL-03'),
    displayName: 'Contábil — mesa do fechamento',
    responsibleName: 'Daniela Prado',
    department: 'contabil',
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
    bootTime: daysAgo(47),
    healthScore: 63,
    healthStatus: 'critical',
    warnings: [
      { severity: 'critical', message: 'Disco quase cheio: só 2,8% livre' },
      {
        severity: 'attention',
        message: 'Ligada há 47 dias sem reiniciar — pode haver atualização pendente',
      },
    ],
    lastSeenAt: minutesAgo(1),
    agentVersion: '1.0.0',
  },

  /* CASO LIMITE: cadastrada e o agente nunca instalado. Tudo nulo, nota cheia e nunca vista —
     a ficha precisa dizer "ainda não sei", e não mostrar uma máquina perfeita que não existe. */
  {
    ...base(4, 'FISCAL-04'),
    displayName: 'Fiscal — máquina nova, agente pendente',
    responsibleName: 'Eduardo Lima',
    department: 'fiscal',
    createdAt: daysAgo(2),
  },

  /* Sumida: o agente não aparece há uma semana. Offline não é defeito — é o que se investiga. */
  {
    ...base(5, 'COMERCIAL-05'),
    displayName: 'Comercial — notebook de visita',
    responsibleName: 'Fernanda Rocha',
    department: 'comercial',
    os: 'Microsoft Windows 11 Pro',
    platform: 'windows',
    platformVersion: '10.0.26100',
    kernelVersion: '10.0.26100',
    arch: 'amd64',
    cpuModel: 'Intel Core i7-1165G7',
    logicalCpus: 8,
    physicalCpus: 4,
    totalMemoryBytes: 16 * GB,
    macAddress: '00:00:5E:00:53:05',
    localIp: '198.51.100.15',
    totalDiskBytes: 512 * GB,
    freeDiskBytes: 300 * GB,
    uptimeSeconds: 6 * 60 * 60,
    bootTime: daysAgo(7),
    healthScore: 100,
    healthStatus: 'good',
    warnings: [],
    lastSeenAt: daysAgo(7),
    agentVersion: '0.9.0',
  },

  /* BLOQUEADA: token válido, conexão recusada. É o caso do coletor que não devia estar enviando. */
  {
    ...base(6, 'CS-06'),
    displayName: 'CS — máquina de estágio',
    responsibleName: 'Gustavo Alves',
    department: 'cs',
    os: 'Microsoft Windows 10 Pro',
    platform: 'windows',
    platformVersion: '10.0.19045',
    kernelVersion: '10.0.19045',
    arch: 'amd64',
    cpuModel: 'Intel Core i5-8400',
    logicalCpus: 6,
    physicalCpus: 6,
    totalMemoryBytes: 8 * GB,
    macAddress: '00:00:5E:00:53:06',
    localIp: '198.51.100.16',
    totalDiskBytes: 240 * GB,
    freeDiskBytes: 90 * GB,
    uptimeSeconds: 12 * 60 * 60,
    bootTime: daysAgo(1),
    healthScore: 100,
    healthStatus: 'good',
    warnings: [],
    lastSeenAt: daysAgo(3),
    agentVersion: '1.0.0',
    isBlocked: true,
    blockReason: 'Máquina emprestada devolvida ao fornecedor; parou de ser monitorada.',
    updatedAt: daysAgo(3),
    updatedBy: TI,
  },

  /* ARQUIVADA: não aparece na lista a não ser que se peça. Continua inteira no banco. */
  {
    ...base(7, 'RH-07'),
    displayName: 'RH — desktop antigo (trocado)',
    responsibleName: 'Helena Braga',
    department: 'rh',
    os: 'Microsoft Windows 10 Pro',
    platform: 'windows',
    platformVersion: '10.0.19045',
    kernelVersion: '10.0.19045',
    arch: 'amd64',
    cpuModel: 'Intel Core i3-4160',
    logicalCpus: 4,
    physicalCpus: 2,
    totalMemoryBytes: 4 * GB,
    macAddress: '00:00:5E:00:53:07',
    localIp: '198.51.100.17',
    totalDiskBytes: 120 * GB,
    freeDiskBytes: 8 * GB,
    uptimeSeconds: 60 * 60,
    bootTime: daysAgo(90),
    healthScore: 63,
    healthStatus: 'critical',
    warnings: [{ severity: 'critical', message: 'Disco quase cheio: só 6,6% livre' }],
    lastSeenAt: daysAgo(60),
    agentVersion: '0.9.0',
    isArchived: true,
    updatedAt: daysAgo(60),
    updatedBy: TI,
  },

  /* DESCARTADA: saiu de uso de vez, com tipo e motivo. Não aparece no inventário nem conta
     no painel — só na tela de Descarte, com o histórico dela inteiro. */
  {
    ...base(9, 'RECEPCAO-09'),
    displayName: 'Recepção — micro antigo do balcão',
    responsibleName: 'Bia Costa',
    department: 'recepcao',
    os: 'Microsoft Windows 10 Pro',
    platform: 'windows',
    platformVersion: '10.0.19045',
    kernelVersion: '10.0.19045',
    arch: 'amd64',
    cpuModel: 'Intel Core i3-3220',
    logicalCpus: 4,
    physicalCpus: 2,
    totalMemoryBytes: 4 * GB,
    macAddress: '00:00:5E:00:53:09',
    localIp: '198.51.100.19',
    totalDiskBytes: 120 * GB,
    freeDiskBytes: 30 * GB,
    uptimeSeconds: 60 * 60,
    bootTime: daysAgo(200),
    healthScore: 88,
    healthStatus: 'attention',
    warnings: [{ severity: 'attention', message: 'Memória RAM abaixo de 8 GB: 4,0 GB' }],
    lastSeenAt: daysAgo(180),
    agentVersion: '0.9.0',
    disposedAt: daysAgo(45),
    disposalType: 'defect',
    disposalReason: 'Fonte queimada duas vezes no mesmo semestre; peças aproveitadas no estoque.',
    updatedAt: daysAgo(45),
    updatedBy: TI,
  },

  /* LIXO: não liga mais e não rende peça — o outro tipo de descarte. */
  {
    ...base(10, 'FISCAL-10'),
    displayName: 'Fiscal — micro que pegou raio',
    responsibleName: 'Eduardo Lima',
    department: 'fiscal',
    os: 'Microsoft Windows 10 Pro',
    platform: 'windows',
    arch: 'amd64',
    cpuModel: 'Intel Core i3-4160',
    logicalCpus: 4,
    physicalCpus: 2,
    totalMemoryBytes: 4 * GB,
    totalDiskBytes: 500 * GB,
    freeDiskBytes: 400 * GB,
    lastSeenAt: daysAgo(300),
    agentVersion: '0.9.0',
    healthScore: 100,
    healthStatus: 'good',
    warnings: [],
    disposedAt: daysAgo(120),
    disposalType: 'scrap',
    disposalReason: 'Placa-mãe queimada em descarga elétrica; sem conserto.',
    updatedAt: daysAgo(120),
    updatedBy: TI,
  },

  /* CASO LIMITE DE LAYOUT: nome comprido em tudo, para a lista quebrar linha em vez de
     empurrar os botões para fora da tela. */
  {
    ...base(8, 'PARALEGAL-08-ESTACAO-COMPARTILHADA'),
    displayName: 'Paralegal — estação compartilhada do corredor (usada por mais de uma pessoa)',
    responsibleName: 'Isabela Marques de Oliveira e Souza Rodrigues',
    department: 'paralegal',
    os: 'Microsoft Windows 11 Pro',
    platform: 'windows',
    platformVersion: '10.0.26100',
    kernelVersion: '10.0.26100',
    arch: 'amd64',
    cpuModel: 'Intel Core i5-10400',
    logicalCpus: 12,
    physicalCpus: 6,
    totalMemoryBytes: 8 * GB,
    macAddress: '00:00:5E:00:53:08',
    localIp: '198.51.100.18',
    totalDiskBytes: 256 * GB,
    freeDiskBytes: 40 * GB,
    uptimeSeconds: 5 * 24 * 60 * 60,
    bootTime: daysAgo(5),
    healthScore: 100,
    healthStatus: 'good',
    warnings: [],
    lastSeenAt: minutesAgo(9),
    agentVersion: '1.0.0',
  },
];

/**
 * A série de uso das últimas 24 horas das máquinas que enviam telemetria.
 *
 * Uma leitura a cada 5 minutos — o agente de verdade manda a cada 30 segundos, mas 2.880
 * linhas por máquina só para o seed encheriam o banco de teste sem mostrar nada de novo no
 * gráfico.
 *
 * Os valores são uma ONDA determinística, e não sorteio: o mesmo seed desenha o mesmo gráfico
 * em toda máquina que rodar, e um gráfico que muda a cada execução não serve para conferir se
 * a tela está certa.
 */
const SAMPLE_INTERVAL_MINUTES = 5;
const SAMPLES_PER_COMPUTER = (24 * 60) / SAMPLE_INTERVAL_MINUTES;

type UsageShape = {
  computerId: number;
  cpuBase: number;
  memoryBase: number;
  diskPercent: number;
  /** Em que ponto da série a máquina trava — o pico que abriu o alerta. Nulo se não trava. */
  spikeAt: number | null;
};

const USAGE_SHAPES: UsageShape[] = [
  { computerId: 1, cpuBase: 22, memoryBase: 48, diskPercent: 56, spikeAt: null },
  { computerId: 2, cpuBase: 41, memoryBase: 86, diskPercent: 75, spikeAt: 210 },
  { computerId: 3, cpuBase: 35, memoryBase: 71, diskPercent: 97, spikeAt: 250 },
  { computerId: 8, cpuBase: 18, memoryBase: 44, diskPercent: 84, spikeAt: null },
];

/** Mantém a medida entre 0 e 100: porcentagem fora disso quebraria o eixo do gráfico. */
function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

function samplesOf(shape: UsageShape): ComputerSampleInsert[] {
  const samples: ComputerSampleInsert[] = [];

  for (let index = 0; index < SAMPLES_PER_COMPUTER; index += 1) {
    const minutesBack = (SAMPLES_PER_COMPUTER - index) * SAMPLE_INTERVAL_MINUTES;
    /* A onda lenta é o ritmo do dia: sobe no meio do expediente e cai à noite. */
    const wave = Math.sin(index / 18) * 12;
    const isSpike = shape.spikeAt !== null && index >= shape.spikeAt && index < shape.spikeAt + 8;

    samples.push({
      /* `id` fixo por máquina e por posição: é o que deixa o seed reescrever em vez de somar. */
      id: shape.computerId * 1000 + index,
      computerId: shape.computerId,
      sampledAt: minutesAgo(minutesBack),
      cpuPercent: clampPercent(isSpike ? 99 : shape.cpuBase + wave),
      memoryPercent: clampPercent(isSpike ? 99 : shape.memoryBase + wave / 2),
      diskPercent: clampPercent(shape.diskPercent),
      networkBytesPerSec: Math.round(120_000 + Math.abs(wave) * 9_000),
    });
  }

  return samples;
}

export const COMPUTER_SAMPLES_SEED: ComputerSampleInsert[] = USAGE_SHAPES.flatMap(samplesOf);

/**
 * Os episódios de alerta.
 *
 * Há um EM ABERTO de propósito (o disco da contábil): é o que a ficha precisa mostrar em
 * vermelho, e o que separa "está travada agora" de "travou ontem por vinte minutos".
 */
export const COMPUTER_ALERTS_SEED: ComputerAlertInsert[] = [
  {
    id: 1,
    computerId: 3,
    metric: 'disk',
    peakValue: 97.2,
    threshold: 90,
    status: 'active',
    startedAt: hoursAgo(20),
    recoveredAt: null,
    causeProcess: 'OneDrive.exe',
    createdAt: hoursAgo(20),
  },
  {
    id: 2,
    computerId: 3,
    metric: 'cpu',
    peakValue: 99.4,
    threshold: 98,
    status: 'recovered',
    startedAt: hoursAgo(3),
    recoveredAt: hoursAgo(2),
    causeProcess: 'excel.exe',
    createdAt: hoursAgo(3),
  },
  {
    id: 3,
    computerId: 2,
    metric: 'memory',
    peakValue: 99.1,
    threshold: 98,
    status: 'recovered',
    startedAt: hoursAgo(6),
    recoveredAt: hoursAgo(5),
    causeProcess: 'chrome.exe',
    createdAt: hoursAgo(6),
  },
  {
    id: 4,
    computerId: 2,
    metric: 'cpu',
    peakValue: 98.6,
    threshold: 98,
    status: 'recovered',
    startedAt: daysAgo(2),
    recoveredAt: new Date(NOW - 2 * DAY + 25 * MINUTE),
    causeProcess: 'MsMpEng.exe',
    createdAt: daysAgo(2),
  },
];
