import { type ComputerAlertInsert } from '../../../server/src/lib/db/schema/computer-alerts.schema';
import { type ComputerInsert } from '../../../server/src/lib/db/schema/computers.schema';
import { between, chance, fraction, pick, pickWeighted, timeRuler } from '../volume.util';

/**
 * O PARQUE EM VOLUME — as máquinas que faltavam para as telas serem julgadas de verdade.
 *
 * As oito máquinas escritas à mão continuam existindo, e são elas que cobrem os limites: a
 * que nunca foi vista, a bloqueada, a descartada, a arquivada. O que falta a elas é
 * QUANTIDADE — com oito máquinas não dá para saber se a nota de saúde do painel separa
 * alguma coisa, se a lista aguenta páginas, se o medidor de "máquinas de pé" sai de 100%.
 *
 * Nada aqui sorteia: ver `volume.util`. As máquinas geradas ocupam ids a partir de 100, para
 * nunca colidirem com as escritas à mão e para ficar óbvio no banco quem é quem.
 */
const TI = 'suporte@azuos.local';

const GB = 1024 ** 3;

const { daysAgo, hoursAgo, minutesAgo } = timeRuler();

/** O primeiro id das máquinas geradas. Abaixo disto são as escritas à mão. */
export const FIRST_GENERATED_COMPUTER_ID = 100;

/** Quantas máquinas o parque gerado tem, além das escritas à mão. */
const GENERATED_COMPUTERS = 42;

const DEPARTMENTS = [
  'contabil',
  'fiscal',
  'financeiro',
  'paralegal',
  'pessoal',
  'recepcao',
  'rh',
  'comercial',
  'cs',
  'analyze',
  'certificado',
] as const;

/** Um parque de escritório de verdade: máquinas boas, medianas e sucata, nesta proporção. */
const MODELS = [
  { cpu: 'Intel Core i5-12400', cores: 12, physical: 6, memoryGb: 16, diskGb: 480 },
  { cpu: 'Intel Core i5-10400', cores: 12, physical: 6, memoryGb: 16, diskGb: 480 },
  { cpu: 'AMD Ryzen 5 5600G', cores: 12, physical: 6, memoryGb: 16, diskGb: 500 },
  { cpu: 'Intel Core i3-10100', cores: 8, physical: 4, memoryGb: 8, diskGb: 240 },
  { cpu: 'Intel Core i7-11700', cores: 16, physical: 8, memoryGb: 32, diskGb: 1000 },
  { cpu: 'Intel Core i3-7100', cores: 4, physical: 2, memoryGb: 4, diskGb: 120 },
  { cpu: 'AMD Ryzen 3 3200G', cores: 8, physical: 4, memoryGb: 8, diskGb: 240 },
] as const;

const PEOPLE = [
  'Ana Ribeiro',
  'Bruno Tavares',
  'Camila Nunes',
  'Diego Farias',
  'Elisa Moretti',
  'Fábio Andrade',
  'Gabriela Pinto',
  'Heitor Barbosa',
  'Iara Lemos',
  'João Vicente',
  'Karina Duarte',
  'Lucas Peixoto',
  'Marina Bastos',
  'Nelson Aguiar',
  'Olívia Camargo',
  'Paulo Rezende',
  'Queila Martins',
  'Rafael Siqueira',
  'Sabrina Toledo',
  'Thiago Amorim',
] as const;

/** O prefixo do nome técnico segue o departamento, como num parque batizado de verdade. */
const PREFIXES: Record<(typeof DEPARTMENTS)[number], string> = {
  contabil: 'CONTABIL',
  fiscal: 'FISCAL',
  financeiro: 'FINANCEIRO',
  paralegal: 'PARALEGAL',
  pessoal: 'PESSOAL',
  recepcao: 'RECEPCAO',
  rh: 'RH',
  comercial: 'COMERCIAL',
  cs: 'CS',
  analyze: 'ANALYZE',
  certificado: 'CERT',
};

/**
 * O `id` viaja ao lado do insert, e não só dentro dele.
 *
 * No tipo da tabela ele é OPCIONAL (o banco sabe gerar sozinho), então lê-lo de volta do
 * insert dá `number | undefined` — e alerta e amostra precisam dele obrigatoriamente, para
 * apontar para a máquina certa.
 */
type Generated = {
  id: number;
  hasAgent: boolean;
  computer: ComputerInsert;
  usage: { cpu: number; memory: number; disk: number };
};

/**
 * A NOTA DE SAÚDE a partir do que a máquina tem e de como ela está.
 *
 * A conta é a mesma ideia da régua do sistema (`computer-health.util`): disco cheio e memória
 * no talo derrubam a nota, pouca memória instalada derruba junto. Ela é reproduzida aqui em
 * vez de importada porque o seed grava a COLUNA já calculada — é assim que o servidor grava
 * quando o agente envia, e um seed que gravasse outra coisa faria a lista discordar da ficha.
 */
function healthOf(usage: { cpu: number; memory: number; disk: number }, memoryGb: number) {
  let score = 100;

  if (usage.disk >= 90) score -= 30;
  else if (usage.disk >= 75) score -= 12;

  if (usage.memory >= 90) score -= 24;
  else if (usage.memory >= 80) score -= 10;

  if (memoryGb <= 4) score -= 20;
  else if (memoryGb <= 8) score -= 8;

  score = Math.max(12, score);

  const status = score <= 65 ? 'critical' : score <= 85 ? 'attention' : 'good';

  return { score, status } as const;
}

/** Os avisos que a ficha mostra, montados do mesmo estado que deu a nota. */
function warningsOf(usage: { cpu: number; memory: number; disk: number }, memoryGb: number) {
  const warnings: { severity: 'critical' | 'attention'; message: string }[] = [];

  if (usage.disk >= 90) {
    warnings.push({
      severity: 'critical',
      message: `Disco quase cheio: só ${(100 - usage.disk).toFixed(1)}% livre`,
    });
  }

  if (usage.memory >= 90) {
    warnings.push({ severity: 'critical', message: `Memória no limite: ${usage.memory}% em uso` });
  }

  if (memoryGb <= 4) {
    warnings.push({ severity: 'attention', message: `Só ${memoryGb} GB de memória instalada` });
  }

  return warnings;
}

function generate(index: number): Generated {
  const id = FIRST_GENERATED_COMPUTER_ID + index;
  const department = pick(DEPARTMENTS, index);
  const model = pickWeighted(MODELS, index * 3 + 1);
  const person = pick(PEOPLE, index * 7 + 2);

  /* O número no nome vem do índice, e não do sorteio: duas máquinas com o mesmo nome técnico
     quebrariam a chave pela qual o agente se encontra. */
  const name = `${PREFIXES[department]}-${String(10 + index).padStart(2, '0')}`;

  const usage = {
    cpu: between(8, 62, index * 5),
    memory: between(38, 96, index * 11 + 3),
    disk: between(28, 98, index * 13 + 5),
  };

  const health = healthOf(usage, model.memoryGb);

  /* Nem toda máquina do parque tem agente: umas ficaram sem instalar, e é isso que o painel
     conta em "cadastradas cujo agente nunca conectou". */
  const hasAgent = !chance(14, index * 17);
  const totalDisk = model.diskGb * GB;

  return {
    id,
    hasAgent,
    usage,
    computer: {
      id,
      name,
      tokenHash: `seed-token-hash-${id}`,
      /* O NÚMERO entra no apelido, e não só o primeiro nome da pessoa. Sem ele, duas
         máquinas do mesmo setor com responsáveis de nome igual nasciam com o mesmo apelido —
         e apelido é o que as telas mostram no lugar do nome técnico. */
      displayName: `${PREFIXES[department][0]}${PREFIXES[department].slice(1).toLowerCase()} ${String(10 + index).padStart(2, '0')} — ${person.split(' ')[0]}`,
      responsibleName: person,
      department,
      os: model.memoryGb <= 8 ? 'Microsoft Windows 10 Pro' : 'Microsoft Windows 11 Pro',
      platform: 'windows',
      platformVersion: model.memoryGb <= 8 ? '10.0.19045' : '10.0.26100',
      kernelVersion: model.memoryGb <= 8 ? '10.0.19045' : '10.0.26100',
      arch: 'amd64',
      cpuModel: model.cpu,
      logicalCpus: model.cores,
      physicalCpus: model.physical,
      totalMemoryBytes: model.memoryGb * GB,
      /* Faixa reservada para documentação: nenhum equipamento de verdade responde nela. */
      macAddress: `00:00:5E:00:53:${String(id).padStart(2, '0')}`,
      localIp: `198.51.100.${(id % 200) + 20}`,
      totalDiskBytes: totalDisk,
      freeDiskBytes: Math.round((totalDisk * (100 - usage.disk)) / 100),
      uptimeSeconds: between(2, 40, index * 19) * 24 * 60 * 60,
      bootTime: daysAgo(between(2, 40, index * 19)),
      healthScore: hasAgent ? health.score : 100,
      healthStatus: hasAgent ? health.status : 'good',
      warnings: hasAgent ? warningsOf(usage, model.memoryGb) : [],
      /* Visto há minutos, horas ou dias: é o que dá conteúdo à coluna "visto pela última vez"
         e o que separa "está online" de "sumiu na semana passada". */
      lastSeenAt: hasAgent ? minutesAgo(between(1, 4300, index * 23)) : null,
      agentVersion: hasAgent ? (chance(30, index * 29) ? '0.9.0' : '1.0.0') : null,
      /* Umas poucas arquivadas: é o que faz o filtro "incluir arquivadas" ter o que mostrar. */
      isArchived: chance(7, index * 31),
      isBlocked: chance(5, index * 37),
      blockReason: chance(5, index * 37) ? 'Máquina retirada para perícia.' : null,
      createdAt: daysAgo(between(60, 900, index * 41)),
      createdBy: TI,
    },
  };
}

const GENERATED = Array.from({ length: GENERATED_COMPUTERS }, (_value, index) => generate(index));

export const GENERATED_COMPUTERS_SEED: ComputerInsert[] = GENERATED.map((item) => item.computer);

/**
 * OS EPISÓDIOS DE ALERTA em volume.
 *
 * Existem para a paginação da ficha ter mais de uma página em várias máquinas, e para o bloco
 * "batendo no teto" do painel ter de que falar. A máquina que está mal acumula dezenas; a que
 * está bem não acumula nenhum — é essa diferença que a tela precisa mostrar.
 *
 * Os ids começam em 1000 porque os escritos à mão vão até 4.
 */
const FIRST_GENERATED_ALERT_ID = 1000;

const CAUSES = [
  'chrome.exe',
  'OneDrive.exe',
  'MsMpEng.exe',
  'excel.exe',
  'Teams.exe',
  'backup.exe',
] as const;

const METRICS = ['cpu', 'memory', 'disk'] as const;

function alertsOf(item: Generated, index: number): ComputerAlertInsert[] {
  if (!item.hasAgent) return [];

  /* Quantos episódios: quem está no limite estoura direto, quem está folgado quase nunca. */
  const pressure = Math.max(item.usage.cpu, item.usage.memory, item.usage.disk);
  const count = pressure >= 90 ? between(18, 54, index) : pressure >= 75 ? between(4, 14, index) : between(0, 3, index);

  return Array.from({ length: count }, (_value, position) => {
    const seed = index * 100 + position;
    const startedHoursAgo = between(1, 30 * 24, seed);
    /* O mais recente de uma máquina no talo pode estar ACONTECENDO AGORA — é o que a ficha
       mostra em vermelho, e o que separa "travada agora" de "travou na terça". */
    const isActive = position === 0 && pressure >= 90;
    const lasted = between(1, 45, seed + 3);

    return {
      id: FIRST_GENERATED_ALERT_ID + seed,
      computerId: item.id,
      metric: pressure === item.usage.disk ? 'disk' : pick(METRICS, seed),
      peakValue: Math.round((95 + fraction(seed) * 5) * 10) / 10,
      threshold: 90,
      status: isActive ? ('active' as const) : ('recovered' as const),
      startedAt: hoursAgo(startedHoursAgo),
      recoveredAt: isActive ? null : hoursAgo(startedHoursAgo - lasted / 60),
      causeProcess: pick(CAUSES, seed + 1),
      createdAt: hoursAgo(startedHoursAgo),
    };
  });
}

export const GENERATED_ALERTS_SEED: ComputerAlertInsert[] = GENERATED.flatMap(alertsOf);

/** Os ids das máquinas geradas que ENVIAM telemetria — quem ganha série de uso de 24 horas. */
export const GENERATED_USAGE_TARGETS = GENERATED.filter((item) => item.hasAgent)
  .slice(0, 10)
  .map((item) => ({
    computerId: item.id,
    cpuBase: item.usage.cpu,
    memoryBase: item.usage.memory,
    diskPercent: item.usage.disk,
    spikeAt: item.usage.cpu > 40 ? between(60, 240, item.id) : null,
  }));
