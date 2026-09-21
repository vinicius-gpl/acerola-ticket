import { describe, expect, it, vi } from 'vitest';

import { isPortInUse, listenOnFirstFreePort } from './listen.util';

function inUse(): Error {
  return Object.assign(new Error('listen EADDRINUSE'), { code: 'EADDRINUSE' });
}

describe('isPortInUse', () => {
  // feliz
  it('recognizes the error the operating system gives for a taken port', () => {
    expect(isPortInUse(inUse())).toBe(true);
  });

  /* O Nest repassa o erro do servidor HTTP embrulhado; parar no primeiro nível faria a troca
     de porta nunca acontecer. */
  it('finds it however deep it was wrapped', () => {
    expect(isPortInUse(Object.assign(new Error('bootstrap falhou'), { cause: inUse() }))).toBe(true);
  });

  // triste
  it('does not mistake another failure for a taken port', () => {
    expect(isPortInUse(Object.assign(new Error('sem permissão'), { code: 'EACCES' }))).toBe(false);
    expect(isPortInUse(new Error('qualquer coisa'))).toBe(false);
    expect(isPortInUse(null)).toBe(false);
  });

  it('does not loop forever on a cause that points at itself (edge case)', () => {
    const loop: { cause?: unknown } = {};
    loop.cause = loop;

    expect(isPortInUse(loop)).toBe(false);
  });
});

describe('listenOnFirstFreePort', () => {
  // feliz
  it('uses the port that was asked for when it is free', async () => {
    const listen = vi.fn().mockResolvedValue(undefined);

    await expect(listenOnFirstFreePort(listen, 3333)).resolves.toBe(3333);
    expect(listen).toHaveBeenCalledExactlyOnceWith(3333);
  });

  /* O caso que motivou isto: outro projeto já está na 3333. */
  it('moves to the next port when the one asked for is taken', async () => {
    const listen = vi
      .fn()
      .mockRejectedValueOnce(inUse())
      .mockRejectedValueOnce(inUse())
      .mockResolvedValue(undefined);

    await expect(listenOnFirstFreePort(listen, 3333)).resolves.toBe(3335);
    expect(listen).toHaveBeenNthCalledWith(3, 3335);
  });

  // triste
  /* Insistir numa falha que não é porta ocupada trocaria uma mensagem clara por dez
     tentativas e uma confusa. */
  it('gives up immediately on a failure that is not a taken port', async () => {
    const other = Object.assign(new Error('sem permissão'), { code: 'EACCES' });
    const listen = vi.fn().mockRejectedValue(other);

    await expect(listenOnFirstFreePort(listen, 80)).rejects.toThrow('sem permissão');
    expect(listen).toHaveBeenCalledOnce();
  });

  it('stops after the last attempt, saying which ports it tried (edge case)', async () => {
    const listen = vi.fn().mockRejectedValue(inUse());

    await expect(listenOnFirstFreePort(listen, 3333, 3)).rejects.toThrow(/3333 a 3335/);
    expect(listen).toHaveBeenCalledTimes(3);
  });
});
