import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { type HistoryService } from '../service/history.service';
import { HistoryInterceptor } from './history.interceptor';

function contextFor(method: string): ExecutionContext {
  const request = {
    method,
    route: { path: '/api/tickets/:id' },
    path: '/api/tickets/3',
    params: { id: '3' },
    body: { status: 'closed' },
    user: { id: 'ana-id', email: 'ana@empresa.com.br' },
    ip: '10.0.0.1',
    get: () => 'Firefox',
  };

  return {
    getType: () => 'http',
    getHandler: () => function update() {},
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function makeInterceptor(skipped = false) {
  const record = vi.fn().mockResolvedValue(undefined);
  const reflector = { getAllAndOverride: () => skipped } as unknown as Reflector;

  return {
    interceptor: new HistoryInterceptor(reflector, { record } as unknown as HistoryService),
    record,
  };
}

const answer = (value: unknown): CallHandler => ({ handle: () => of(value) });

describe('HistoryInterceptor', () => {
  // feliz
  it('records a change that worked and gives the response back untouched', async () => {
    const { interceptor, record } = makeInterceptor();

    const result = await firstValueFrom(
      interceptor.intercept(contextFor('PATCH'), answer({ id: 3 })),
    );

    expect(result).toEqual({ id: 3 });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tickets.update', actorId: 'ana-id', targetId: '3' }),
    );
  });

  // triste
  it('does not record a read', async () => {
    const { interceptor, record } = makeInterceptor();

    await firstValueFrom(interceptor.intercept(contextFor('GET'), answer([])));

    expect(record).not.toHaveBeenCalled();
  });

  it('does not record a route marked to skip', async () => {
    const { interceptor, record } = makeInterceptor(true);

    await firstValueFrom(interceptor.intercept(contextFor('POST'), answer(null)));

    expect(record).not.toHaveBeenCalled();
  });

  /* Recusada, a requisição não mudou nada: não há o que registrar. */
  it('does not record a change that failed', async () => {
    const { interceptor, record } = makeInterceptor();
    const failing: CallHandler = { handle: () => throwError(() => new Error('refused')) };

    await expect(
      firstValueFrom(interceptor.intercept(contextFor('PATCH'), failing)),
    ).rejects.toThrow('refused');
    expect(record).not.toHaveBeenCalled();
  });
});
