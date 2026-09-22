import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type AlertMetric,
  ALERT_THRESHOLDS,
  decideAlerts,
  describeAlert,
} from '@template/shared/domain/computer-alert.util';
import { type AgentSnapshot } from '@template/shared/schemas/agent-snapshot.schema';
import {
  type Computer,
  type ComputerListQuery,
  type ComputerSample,
  type CreateComputerInput,
  type CreatedComputer,
  type UpdateComputerInput,
} from '@template/shared/schemas/computer.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { assertCanCreate, assertCanRead } from '../../../lib/policy/policy-assert.util';
import { type ComputerRow } from '../../../lib/db/schema/computers.schema';
import {
  toComputer,
  toComputerInsert,
  toComputerSample,
  toComputerUpdate,
  toSample,
  toSnapshotUpdate,
} from '../mapper/computers.mapper';
import { AgentPresenceService } from '../presence/agent-presence.service';
import { ComputersRepository } from '../repository/computers.repository';
import { createComputerToken, hashComputerToken } from '../token/computer-token.util';

const NOT_FOUND = 'Computador não encontrado. Ele pode ter sido arquivado — recarregue a lista.';

/** Quantos alertas a tela de detalhe mostra. Mais que isso vira rolagem que ninguém lê. */
const ALERT_PAGE_SIZE = 50;

/** O recorte padrão do gráfico de uso: as últimas 24 horas, como no sistema antigo. */
const DEFAULT_SAMPLE_HOURS = 24;

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

/** Por que uma conexão de agente foi recusada — o agente registra isso no log dele. */
export type AgentRejection = 'invalid-token' | 'blocked';

export type AgentAuthResult =
  | { ok: true; computer: ComputerRow }
  | { ok: false; reason: AgentRejection };

/**
 * O ÚNICO caminho de escrita de computador.
 *
 * Duas fronteiras diferentes convivem aqui, e é de propósito:
 *
 * - `list`, `findById`, `create`, `update`, `samples` e `alerts` são do painel, e começam pela
 *   policy — quem chama tem identidade.
 * - `authenticateAgent` e `ingest` são do AGENTE, que não é uma pessoa. A proteção deles não é
 *   a policy: é o token, e o fato de o agente só conseguir escrever telemetria da própria
 *   máquina. Nenhum caminho do agente altera cadastro.
 *
 * Não existe exclusão de computador: máquina que saiu de uso é arquivada.
 */
@Injectable()
export class ComputersService {
  constructor(
    private readonly repository: ComputersRepository,
    private readonly presence: AgentPresenceService,
  ) {}

  async list(user: RequestUser, query: ComputerListQuery): Promise<Paginated<Computer>> {
    assertCanRead(user.role, 'os computadores');

    const page = await this.repository.list(query);
    /* Os ids online vêm de uma vez: perguntar linha a linha daria o mesmo resultado com mais
       trabalho, e a lista pode ter duzentas máquinas. */
    const online = this.presence.onlineIds();

    return {
      items: page.rows.map((row) => toComputer(row, online.has(row.id))),
      total: page.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(user: RequestUser, id: number): Promise<Computer> {
    assertCanRead(user.role, 'os computadores');

    const row = await this.requireComputer(id);

    return toComputer(row, this.presence.isOnline(row.id));
  }

  /**
   * Cadastra a máquina e devolve o token, em texto puro, UMA vez.
   *
   * Depois desta resposta o token não existe legível em lugar nenhum — o banco guarda só o
   * hash. Se a pessoa perder, o caminho é gerar outro, não recuperar.
   */
  async create(user: RequestUser, input: CreateComputerInput): Promise<CreatedComputer> {
    assertCanCreate(user.role, 'computadores');

    const token = createComputerToken();
    const row = await this.repository.insert(
      toComputerInsert(input, hashComputerToken(token), user.email),
    );

    return { computer: toComputer(row, false), token };
  }

  async update(user: RequestUser, id: number, input: UpdateComputerInput): Promise<Computer> {
    assertCanCreate(user.role, 'computadores');

    await this.requireComputer(id);
    const row = await this.repository.update(id, toComputerUpdate(input, user.email));

    return toComputer(row, this.presence.isOnline(row.id));
  }

  /**
   * Gera um token novo e invalida o anterior.
   *
   * É o caminho para quando o token se perde, e também para quando ele vaza: trocar aqui
   * derruba o agente antigo na próxima conexão, sem precisar mexer na máquina.
   */
  async regenerateToken(user: RequestUser, id: number): Promise<CreatedComputer> {
    assertCanCreate(user.role, 'computadores');

    await this.requireComputer(id);
    const token = createComputerToken();
    const row = await this.repository.update(id, {
      tokenHash: hashComputerToken(token),
      updatedAt: new Date(),
      updatedBy: user.email,
    });

    return { computer: toComputer(row, this.presence.isOnline(row.id)), token };
  }

  /** As amostras de uso das últimas horas, para o gráfico da tela de detalhe. */
  async samples(user: RequestUser, id: number, hours = DEFAULT_SAMPLE_HOURS): Promise<ComputerSample[]> {
    assertCanRead(user.role, 'os computadores');

    await this.requireComputer(id);
    const since = new Date(Date.now() - hours * MILLISECONDS_PER_HOUR);

    return (await this.repository.listSamplesSince(id, since)).map(toComputerSample);
  }

  async alerts(user: RequestUser, id: number) {
    assertCanRead(user.role, 'os computadores');

    await this.requireComputer(id);

    return this.repository.listAlerts(id, ALERT_PAGE_SIZE);
  }

  /**
   * A porta do AGENTE: confere quem está conectando.
   *
   * Devolve o motivo da recusa em vez de lançar, porque quem chama é o WebSocket — ele precisa
   * escolher o código de fechamento e registrar o motivo no log, não tratar exceção.
   *
   * Máquina bloqueada é recusada mesmo com token válido: é assim que se tira do ar um coletor
   * que não devia estar enviando, sem precisar caçar o token dele.
   */
  async authenticateAgent(token: string): Promise<AgentAuthResult> {
    const row = await this.repository.findByTokenHash(hashComputerToken(token));
    /* Token que não bate com ninguém e token de máquina bloqueada são recusas diferentes: a
       segunda é decisão do TI, e o log precisa distinguir uma da outra. */
    if (!row) return { ok: false, reason: 'invalid-token' };
    if (row.isBlocked) return { ok: false, reason: 'blocked' };

    return { ok: true, computer: row };
  }

  /**
   * Grava uma leitura: atualiza a ficha, guarda a amostra e mexe nos alertas.
   *
   * A ordem importa. A ficha primeiro, porque é o que a tela mostra; a amostra depois, porque
   * é histórico e pode esperar; os alertas por último, porque dependem da leitura já estar
   * registrada para o episódio ter começo coerente.
   */
  async ingest(computer: ComputerRow, snapshot: AgentSnapshot, agentVersion: string): Promise<void> {
    await this.repository.update(computer.id, toSnapshotUpdate(snapshot, agentVersion));

    const sample = toSample(computer.id, snapshot);
    await this.repository.insertSample(sample);

    await this.applyAlerts(computer.id, {
      cpu: sample.cpuPercent,
      memory: sample.memoryPercent,
      disk: sample.diskPercent,
    }, snapshot);
  }

  /**
   * Abre, renova e fecha os episódios de alerta desta leitura.
   *
   * Só escreve quando algo muda de estado: uma medida que continua alta sem bater um pico novo
   * não gera escrita nenhuma. Numa frota enviando a cada trinta segundos, escrever a cada
   * leitura seria transformar um problema de dez minutos em vinte linhas iguais.
   */
  private async applyAlerts(
    computerId: number,
    reading: { cpu: number; memory: number; disk: number },
    snapshot: AgentSnapshot,
  ): Promise<void> {
    const active = await this.activeAlertsOf(computerId);
    const decision = decideAlerts(reading, [...active.keys()]);

    for (const metric of decision.toOpen) {
      await this.repository.insertAlert({
        computerId,
        metric,
        peakValue: reading[metric],
        threshold: ALERT_THRESHOLDS[metric],
        causeProcess: heaviestProcess(snapshot),
      });
    }

    for (const metric of decision.toRefresh) {
      const alert = active.get(metric);
      /* O pico só sobe: o que interessa no histórico é o pior momento do episódio. */
      if (!alert || reading[metric] <= alert.peakValue) continue;
      await this.repository.updateAlert(alert.id, { peakValue: reading[metric] });
    }

    for (const metric of decision.toClose) {
      const alert = active.get(metric);
      if (!alert) continue;
      await this.repository.updateAlert(alert.id, { status: 'recovered', recoveredAt: new Date() });
    }
  }

  private async activeAlertsOf(computerId: number) {
    const found = new Map<AlertMetric, { id: number; peakValue: number }>();

    for (const metric of ['cpu', 'memory', 'disk'] as const) {
      const alert = await this.repository.findActiveAlert(computerId, metric);
      if (alert) found.set(metric, { id: alert.id, peakValue: alert.peakValue });
    }

    return found;
  }

  private async requireComputer(id: number): Promise<ComputerRow> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException(NOT_FOUND);

    return row;
  }
}

/**
 * O programa que mais consumia no momento do estouro — a causa PROVÁVEL.
 *
 * É um palpite honesto, e a tela diz isso com todas as letras: o que pesa mais não é
 * necessariamente o culpado, mas é por onde qualquer investigação começa.
 */
function heaviestProcess(snapshot: AgentSnapshot): string | null {
  const heaviest = [...snapshot.processes].sort((a, b) => b.cpuPercent - a.cpuPercent)[0];

  return heaviest?.name ?? null;
}

/** O rótulo do episódio, usado pela tela — exportado para a view não recalcular a frase. */
export { describeAlert };
