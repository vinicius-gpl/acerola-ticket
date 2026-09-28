import { describe, expect, it, vi } from 'vitest';

import { LiveWatchService, WATCH_TTL_MS } from './live-watch.service';

const FAST = 1;

function makeService() {
  const service = new LiveWatchService();
  const asked: { computerId: number; seconds: number }[] = [];

  service.onCadenceChange((computerId, seconds) => asked.push({ computerId, seconds }));

  return { service, asked };
}

describe('LiveWatchService', () => {
  // feliz
  it('asks the agent to speed up when someone starts watching', () => {
    const { service, asked } = makeService();

    service.touch(7, FAST);

    expect(asked).toEqual([{ computerId: 7, seconds: FAST }]);
    expect(service.isWatched(7)).toBe(true);

    service.onModuleDestroy();
  });

  /* A ficha aberta pede a leitura o tempo todo. Repetir o comando a cada pedido encheria a
     conexão do agente de mensagens que não mudam nada. */
  it('asks only once while the same person keeps watching', () => {
    const { service, asked } = makeService();

    service.touch(7, FAST);
    service.touch(7, FAST);
    service.touch(7, FAST);

    expect(asked).toHaveLength(1);

    service.onModuleDestroy();
  });

  it('asks separately for each machine being watched', () => {
    const { service, asked } = makeService();

    service.touch(7, FAST);
    service.touch(9, FAST);

    expect(asked.map((item) => item.computerId)).toEqual([7, 9]);

    service.onModuleDestroy();
  });

  // triste
  /* Aba fechada no tranco, notebook que dorme, rede que cai: nenhum avisa que parou de olhar.
     Sem o vencimento, a máquina ficaria no ritmo rápido para sempre. */
  it('lets the watch expire when the readings stop being asked for', () => {
    /* Relógio parado: com o relógio de verdade, o milissegundo que passa entre gravar a
       inscrição e conferi-la faz o teste falhar de vez em quando — e teste que falha às
       vezes é pior do que teste nenhum. */
    vi.useFakeTimers();
    const { service } = makeService();

    service.touch(7, FAST);

    expect(service.collectExpired(Date.now() + WATCH_TTL_MS + 1)).toEqual([7]);
    expect(service.isWatched(7)).toBe(false);

    service.onModuleDestroy();
    vi.useRealTimers();
  });

  it('keeps watching while the readings keep being asked for', () => {
    vi.useFakeTimers();
    const { service } = makeService();

    service.touch(7, FAST);

    expect(service.collectExpired(Date.now() + WATCH_TTL_MS - 1)).toEqual([]);

    service.onModuleDestroy();
    vi.useRealTimers();
  });

  /* Sem ouvinte registrado o serviço não pode quebrar: ele sobe antes do gateway em qualquer
     ordem de inicialização que o Nest escolher. */
  it('does not break when nobody is listening for the cadence', () => {
    const service = new LiveWatchService();

    expect(() => service.touch(7, FAST)).not.toThrow();

    service.onModuleDestroy();
  });

  it('says a machine nobody opened is not being watched', () => {
    const { service } = makeService();

    expect(service.isWatched(99)).toBe(false);

    service.onModuleDestroy();
  });
});

describe('LiveWatchService sweep', () => {
  // feliz
  it('tells the agent to go back to its own pace once nobody is watching', () => {
    vi.useFakeTimers();

    const { service, asked } = makeService();
    service.touch(7, FAST);

    vi.advanceTimersByTime(WATCH_TTL_MS + 2_000);

    /* Zero é "volte ao SEU intervalo": o servidor não sabe qual é o da máquina, e impor um
       número faria toda máquina terminar no mesmo ritmo depois da primeira visita. */
    expect(asked.at(-1)).toEqual({ computerId: 7, seconds: 0 });

    service.onModuleDestroy();
    vi.useRealTimers();
  });
});
