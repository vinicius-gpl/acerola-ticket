import { Injectable, Logger } from '@nestjs/common';

/**
 * QUEM ESTÁ ONLINE AGORA — a lista de agentes com conexão aberta.
 *
 * Isto não é cache do banco: é a própria verdade. Uma máquina está online se existe uma
 * conexão dela viva neste servidor, ponto. Guardar "online" numa coluna parece mais simples e
 * é justamente o erro: quando a máquina perde energia ninguém fica vivo para escrever
 * "offline", e ela permanece verde na tela para sempre — o TI passa a não confiar no
 * indicador, que é pior do que não tê-lo.
 *
 * **Vive na memória do processo, e isso tem um limite conhecido.** Com mais de uma instância
 * da API atrás de um balanceador, cada uma enxergaria só as suas conexões, e a tela mostraria
 * offline quem está conectado na outra. Enquanto o sistema roda numa instância só, está
 * correto; no dia em que passar a rodar em várias, esta classe é o único lugar que muda — o
 * resto do código só pergunta `isOnline`.
 */
@Injectable()
export class AgentPresenceService {
  private readonly logger = new Logger(AgentPresenceService.name);

  /** id do computador → quando a conexão dele abriu. */
  private readonly connected = new Map<number, Date>();

  /**
   * Marca a máquina como conectada.
   *
   * Reconexão sobrescreve em silêncio: um agente que caiu e voltou pode abrir a nova conexão
   * antes de o servidor perceber que a antiga morreu, e recusar a nova deixaria a máquina
   * offline até um tempo de espera estourar.
   */
  connect(computerId: number, name: string): void {
    this.connected.set(computerId, new Date());
    this.logger.log(`Agent connected: ${name} (#${computerId})`);
  }

  disconnect(computerId: number, name: string): void {
    if (!this.connected.delete(computerId)) return;

    this.logger.log(`Agent disconnected: ${name} (#${computerId})`);
  }

  isOnline(computerId: number): boolean {
    return this.connected.has(computerId);
  }

  /** Os ids online, para a listagem marcar a página inteira sem uma pergunta por linha. */
  onlineIds(): Set<number> {
    return new Set(this.connected.keys());
  }

  connectedSince(computerId: number): Date | null {
    return this.connected.get(computerId) ?? null;
  }

  get onlineCount(): number {
    return this.connected.size;
  }

  /**
   * Esvazia o registro.
   *
   * Chamado no desligamento da API: os sockets morrem junto com o processo, então manter a
   * lista seria descrever um mundo que não existe mais.
   */
  clear(): void {
    this.connected.clear();
  }
}
