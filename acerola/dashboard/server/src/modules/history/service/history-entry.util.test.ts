import { describe, expect, it } from 'vitest';

import { historyEntryOf, isMutation, type MutationRequest } from './history-entry.util';

const UPDATE: MutationRequest = {
  method: 'PATCH',
  routePath: '/api/tickets/:id',
  handler: 'update',
  params: { id: '42' },
  body: { status: 'closed', priority: undefined },
  fileNames: [],
  actor: { id: 'ana-id', email: 'ana@empresa.com.br' },
  ip: '10.0.0.1',
  userAgent: 'Firefox',
};

describe('historyEntryOf', () => {
  // feliz
  it('records who changed which ticket and the fields that were sent', () => {
    expect(historyEntryOf(UPDATE, { id: 42, protocol: 'CH-0042' })).toEqual({
      action: 'tickets.update',
      actorId: 'ana-id',
      actorEmail: 'ana@empresa.com.br',
      targetType: 'tickets',
      targetId: '42',
      targetLabel: 'CH-0042',
      ip: '10.0.0.1',
      userAgent: 'Firefox',
      changes: [{ field: 'status', from: null, to: 'closed' }],
    });
  });

  it('takes the new id from the response of a creation, and lists the uploaded files', () => {
    const entry = historyEntryOf(
      {
        ...UPDATE,
        method: 'POST',
        routePath: '/api/computers',
        handler: 'create',
        params: {},
        fileNames: ['nota.pdf'],
      },
      { data: { id: 7, name: 'PC-07' } },
    );

    expect(entry).toMatchObject({
      action: 'computers.create',
      targetId: '7',
      targetLabel: 'PC-07',
    });
    expect(entry.changes).toContainEqual({ field: 'files', from: null, to: ['nota.pdf'] });
  });

  it('records a machine as no actor', () => {
    expect(historyEntryOf({ ...UPDATE, actor: null }, null)).toMatchObject({
      actorId: null,
      actorEmail: null,
    });
  });

  it('only treats writes as mutations', () => {
    expect(isMutation('delete')).toBe(true);
    expect(isMutation('GET')).toBe(false);
  });

  // triste
  /* Segredo não vai para a tabela, nem o texto inteiro de uma descrição enorme. */
  it('hides secrets and cuts long texts', () => {
    const entry = historyEntryOf(
      { ...UPDATE, body: { agentToken: 'abc', description: 'x'.repeat(600) } },
      undefined,
    );

    expect(entry.changes).toEqual([
      { field: 'agentToken', from: null, to: '[redacted]' },
      { field: 'description', from: null, to: `${'x'.repeat(500)}…` },
    ]);
  });

  it('records no fields when the body is not an object', () => {
    expect(
      historyEntryOf({ ...UPDATE, body: undefined, routePath: '/api/:id' }, 'ok'),
    ).toMatchObject({
      action: 'api.update',
      targetType: null,
      targetLabel: null,
      changes: [],
    });
  });
});
