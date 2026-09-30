import { describe, expect, it } from 'vitest';

import { type HealthRepository } from '../repository/health.repository';
import { HealthService } from './health.service';

/**
 * A rota de saúde é a única coisa que decide se o container é reiniciado. Ela dizer `ok` com
 * o banco fora é o pior defeito possível aqui: o orquestrador deixa no ar um processo que
 * responde erro a todo mundo, e ninguém é avisado.
 */
function serviceWith(isDatabaseUp: boolean): HealthService {
  const repository = { isDatabaseUp: () => Promise.resolve(isDatabaseUp) };

  return new HealthService(repository as HealthRepository);
}

describe('HealthService', () => {
  // feliz
  it('reports ok when the database answers', async () => {
    const status = await serviceWith(true).check();

    expect(status).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('reports how long the process has been up, for a restart loop to show', async () => {
    const status = await serviceWith(true).check();

    expect(status.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(status.uptimeSeconds)).toBe(true);
    expect(new Date(status.checkedAt).toString()).not.toBe('Invalid Date');
  });

  // triste
  /* Processo vivo não é sistema funcionando: sem o banco, a resposta precisa ser ruim. */
  it('reports down when the database does not answer', async () => {
    const status = await serviceWith(false).check();

    expect(status).toMatchObject({ status: 'down', database: 'down' });
  });
});
