import { Logger } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import {
  agentMessageSchema,
  CADENCE_RESTORE,
  type ServerMessage,
} from '@template/shared/schemas/agent-snapshot.schema';

import { type ComputerRow } from '../../../lib/db/schema/computers.schema';
import { AgentPresenceService } from '../presence/agent-presence.service';
import { LiveWatchService } from '../presence/live-watch.service';
import { ComputersService } from '../service/computers.service';

/**
 * Códigos de fechamento, na faixa 4000-4999 que o padrão reserva para a aplicação.
 *
 * O agente registra o código no log dele, e é por ele que quem instalou descobre o que houve
 * sem precisar de acesso ao servidor: 4001 é "o token está errado", 4003 é "o TI bloqueou
 * esta máquina" — problemas completamente diferentes, que um "conexão recusada" genérico
 * transformaria na mesma ligação para o suporte.
 */
const CLOSE_INVALID_TOKEN = 4001;
const CLOSE_BLOCKED = 4003;
const CLOSE_BAD_MESSAGE = 4008;
const CLOSE_HELLO_TIMEOUT = 4009;

/**
 * Quanto o servidor espera pela apresentação antes de derrubar a conexão.
 *
 * Sem isto, quem abrisse um socket e não dissesse nada ficaria segurando recurso para sempre —
 * e é o formato mais barato de ataque que existe contra um servidor de WebSocket.
 */
const HELLO_TIMEOUT_MS = 10_000;

/**
 * O ritmo de quem está sendo olhado, e o de quem não está.
 *
 * Um segundo é a mesma cadência que o agente usa na tela dele: é o que faz o número na ficha
 * mexer junto com a máquina. O ritmo de repouso NÃO é decidido aqui — é o configurado em cada
 * agente —, e por isso o "volte ao normal" viaja como um valor que o agente interpreta como
 * "o seu", e não como um número imposto de fora.
 */
export const WATCHED_CADENCE_SECONDS = 1;

/**
 * A conexão, como o `ws` a entrega.
 *
 * Declarada aqui em vez de instalar `@types/ws`: são três métodos, e uma dependência a mais
 * para tipar três métodos não se paga. É o mesmo critério usado no envio do print de chamado.
 */
type AgentSocket = {
  on: (event: string, listener: (payload: never) => void) => void;
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
};

/** O que o servidor sabe sobre uma conexão enquanto ela está aberta. */
type AgentSession = {
  computer: ComputerRow;
  agentVersion: string;
};

/**
 * A PORTA DO AGENTE.
 *
 * O protocolo é de propósito o mais simples possível, porque quem fala dele do outro lado é um
 * cliente em Go: mensagens JSON com um campo `type`, sem a convenção de evento do Nest e sem
 * Socket.IO. Uma biblioteca de WebSocket qualquer consegue conversar com isto.
 *
 * A conversa tem duas fases. A conexão abre muda: o agente precisa mandar `hello` com o token
 * antes de qualquer outra coisa, e só depois disso o servidor aceita leituras. Autenticar na
 * primeira mensagem, e não na URL, é o que mantém o token fora dos logs de proxy e do
 * histórico de quem abriu o endereço no navegador.
 */
@WebSocketGateway({ path: '/agent' })
export class AgentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AgentGateway.name);

  /** Conexão → o que ela provou ser. Ausente enquanto o `hello` não chegou. */
  private readonly sessions = new Map<AgentSocket, AgentSession>();

  /** Máquina → a conexão dela, para o servidor conseguir FALAR com o agente. */
  private readonly byComputer = new Map<number, AgentSocket>();

  constructor(
    private readonly service: ComputersService,
    private readonly presence: AgentPresenceService,
    private readonly watch: LiveWatchService,
  ) {
    /* Quem decide o ritmo é o registro de quem está olhando; quem sabe falar com o agente é
       este gateway. O registro avisa, e aqui a mensagem sai pelo socket daquela máquina. */
    this.watch.onCadenceChange((computerId, seconds) => this.sendCadence(computerId, seconds));
  }

  /**
   * Pede ao agente daquela máquina para mudar o ritmo de envio.
   *
   * Máquina desligada não tem socket, e isso não é erro: quando ela voltar, volta no ritmo
   * configurado dela, e o primeiro pedido da ficha aberta a acelera de novo.
   */
  private sendCadence(computerId: number, seconds: number): void {
    const client = this.byComputer.get(computerId);
    if (!client) return;

    /* Zero é "volte ao seu intervalo": quem sabe qual é ele é o agente, não o servidor. */
    const message: ServerMessage = { type: 'cadence', seconds: seconds || CADENCE_RESTORE };
    client.send(JSON.stringify(message));
  }

  handleConnection(client: AgentSocket): void {
    /* O relógio começa a correr aqui: sem apresentação em dez segundos, a conexão cai. */
    const timeout = setTimeout(() => {
      if (this.sessions.has(client)) return;
      this.close(client, CLOSE_HELLO_TIMEOUT, 'hello timeout');
    }, HELLO_TIMEOUT_MS);

    client.on('message', (raw: unknown) => {
      void this.onMessage(client, String(raw), timeout);
    });

    client.on('error', (error: Error) => {
      this.logger.warn(`Agent socket error: ${error.message}`);
    });
  }

  handleDisconnect(client: AgentSocket): void {
    const session = this.sessions.get(client);
    if (!session) return;

    this.sessions.delete(client);
    if (this.byComputer.get(session.computer.id) === client) {
      this.byComputer.delete(session.computer.id);
    }
    this.presence.disconnect(session.computer.id, session.computer.name);
  }

  /**
   * Uma mensagem do agente.
   *
   * Tudo que chega aqui é DADO DE FORA: passa pelo schema antes de encostar no banco. Um campo
   * a mais, um número negativo ou um JSON quebrado fecham a conexão em vez de virarem linha.
   */
  private async onMessage(
    client: AgentSocket,
    raw: string,
    timeout: NodeJS.Timeout,
  ): Promise<void> {
    const message = this.parse(raw);
    if (!message) return this.close(client, CLOSE_BAD_MESSAGE, 'unreadable message');

    if (message.type === 'hello') {
      clearTimeout(timeout);

      return this.onHello(client, message.token, message.agentVersion);
    }

    const session = this.sessions.get(client);
    /* Leitura antes da apresentação não é aceita: seria gravar telemetria de quem não provou
       de qual máquina está falando. */
    if (!session) return this.close(client, CLOSE_BAD_MESSAGE, 'snapshot before hello');

    await this.service.ingest(session.computer, message.snapshot, session.agentVersion);
  }

  private async onHello(client: AgentSocket, token: string, agentVersion: string): Promise<void> {
    const result = await this.service.authenticateAgent(token);

    if (!result.ok) {
      const code = result.reason === 'blocked' ? CLOSE_BLOCKED : CLOSE_INVALID_TOKEN;

      return this.close(client, code, result.reason);
    }

    this.sessions.set(client, { computer: result.computer, agentVersion });
    this.byComputer.set(result.computer.id, client);
    this.presence.connect(result.computer.id, result.computer.name);

    /* A máquina pode ter reconectado com alguém já olhando a ficha dela — depois de uma queda
       de rede, por exemplo. Sem isto, ela voltaria no ritmo econômico e a tela pareceria
       travada até alguém recarregar. */
    if (this.watch.isWatched(result.computer.id)) {
      this.sendCadence(result.computer.id, WATCHED_CADENCE_SECONDS);
    }

    /* A confirmação existe para o agente saber que pode começar a enviar — sem ela ele teria
       que supor que deu certo pelo silêncio, e silêncio também é o que um servidor travado
       devolve. */
    client.send(JSON.stringify({ type: 'welcome', computerName: result.computer.name }));
  }

  private parse(raw: string) {
    try {
      const result = agentMessageSchema.safeParse(JSON.parse(raw));

      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }

  private close(client: AgentSocket, code: number, reason: string): void {
    this.logger.warn(`Agent connection refused (${code}): ${reason}`);
    client.close(code, reason);
  }
}
