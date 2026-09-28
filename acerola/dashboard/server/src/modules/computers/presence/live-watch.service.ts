import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';

/**
 * QUEM ESTÁ OLHANDO uma máquina agora — e, por isso, quem merece leitura depressa.
 *
 * O agente manda uma leitura a cada 30 segundos. É o certo para uma frota: cem máquinas a um
 * segundo seriam cem escritas por segundo num banco que ninguém consulta nessa velocidade.
 * Mas é lentidão demais para quem abriu UMA ficha e quer ver o processador mexer.
 *
 * A saída é pedir pressa só para a máquina que alguém está olhando. E "estar olhando" não é
 * um botão que a pessoa aperta: é simplesmente a ficha, aberta, pedindo a leitura. Cada
 * pedido renova a inscrição; parar de pedir a deixa vencer sozinha.
 *
 * **Por que vencimento por tempo, e não um "fechei a tela".** Aba fechada no tranco, notebook
 * que dorme, rede que cai: nenhum desses avisa que parou de olhar. Com um aviso de saída, a
 * máquina ficaria presa no ritmo rápido para sempre — o mesmo motivo pelo qual "online" aqui
 * é uma conexão viva, e não uma coluna.
 */

/** Quanto tempo um pedido mantém a máquina como "sendo olhada". */
export const WATCH_TTL_MS = 10_000;

/**
 * O ritmo de quem está sendo olhado.
 *
 * Um segundo é a mesma cadência que o agente usa na tela dele: é o que faz o número na ficha
 * mexer junto com a máquina. O ritmo de REPOUSO não é decidido aqui — é o configurado em cada
 * agente —, e por isso o "volte ao normal" viaja como zero, e não como um número imposto.
 *
 * Mora neste arquivo, e não no gateway, porque quem o usa são os dois: o gateway para mandar
 * o comando e o service para pedir a aceleração. Tê-lo no gateway fazia o service importar o
 * gateway, que importa o service — e o Nest recusa a subir com essa volta.
 */
export const WATCHED_CADENCE_SECONDS = 1;

/** De quanto em quanto tempo as inscrições vencidas são varridas. */
const SWEEP_INTERVAL_MS = 2_000;

export type CadenceListener = (computerId: number, seconds: number) => void;

@Injectable()
export class LiveWatchService implements OnModuleDestroy {
  private readonly logger = new Logger(LiveWatchService.name);

  /** Máquina → instante em que a inscrição vence. */
  private readonly watching = new Map<number, number>();

  private listener: CadenceListener | null = null;
  private sweep: NodeJS.Timeout | null = null;

  /**
   * Quem recebe o pedido de mudar o ritmo — na prática, o gateway do agente.
   *
   * É um ouvinte registrado, e não uma injeção de dependência, porque o caminho natural seria
   * o contrário: é o gateway que atende o agente. Injetar um no outro nos dois sentidos daria
   * dependência circular, e o Nest recusaria.
   */
  onCadenceChange(listener: CadenceListener): void {
    this.listener = listener;
  }

  /**
   * Alguém pediu a leitura desta máquina. Renova a inscrição, e pede pressa se ela estava
   * no ritmo econômico.
   */
  touch(computerId: number, fastSeconds: number): void {
    const wasWatched = this.isWatched(computerId);
    this.watching.set(computerId, Date.now() + WATCH_TTL_MS);
    this.start();

    if (wasWatched) return;

    this.logger.log(`Computer ${computerId} is being watched: asking for ${fastSeconds}s readings`);
    this.listener?.(computerId, fastSeconds);
  }

  isWatched(computerId: number): boolean {
    const expiresAt = this.watching.get(computerId);

    return expiresAt !== undefined && expiresAt > Date.now();
  }

  /**
   * Devolve as máquinas cuja inscrição venceu agora, tirando-as da lista.
   *
   * Separado da varredura para poder ser testado sem relógio de verdade.
   */
  collectExpired(now = Date.now()): number[] {
    const expired: number[] = [];

    for (const [computerId, expiresAt] of this.watching) {
      if (expiresAt > now) continue;

      expired.push(computerId);
      this.watching.delete(computerId);
    }

    return expired;
  }

  /** A varredura só existe enquanto houver alguém olhando alguma coisa. */
  private start(): void {
    if (this.sweep) return;

    this.sweep = setInterval(() => this.tick(), SWEEP_INTERVAL_MS);
    /* Um timer pendurado impediria o processo de encerrar — no teste E2E isso trava a suíte. */
    this.sweep.unref?.();
  }

  private tick(): void {
    for (const computerId of this.collectExpired()) {
      this.logger.log(`Nobody is watching computer ${computerId} anymore: back to the slow pace`);
      /* Zero significa "volte ao seu intervalo configurado": o servidor não sabe qual é, e
         chutar um número aqui sobrescreveria o que foi decidido na instalação da máquina. */
      this.listener?.(computerId, 0);
    }

    if (this.watching.size > 0) return;

    clearInterval(this.sweep ?? undefined);
    this.sweep = null;
  }

  onModuleDestroy(): void {
    if (!this.sweep) return;

    clearInterval(this.sweep);
    this.sweep = null;
  }
}
