import { describe, expect, it } from 'vitest';

import { HealthRepository } from './health.repository';
import { type Database } from '../../../lib/db/db.type';

/**
 * O único repository do projeto que engole a falha do banco de propósito: aqui "o banco está
 * fora" é a RESPOSTA, não um erro. Se ele deixasse a exceção subir, a rota de saúde
 * responderia 500 genérico e perderia a única informação que ela sabe dar.
 */
function repositoryWith(execute: () => PromiseLike<unknown>): HealthRepository {
  return new HealthRepository({ execute } as unknown as Database);
}

describe('HealthRepository', () => {
  // feliz
  it('says the database is up when the query answers', async () => {
    const repository = repositoryWith(() => Promise.resolve([{ '1': 1 }]));

    await expect(repository.isDatabaseUp()).resolves.toBe(true);
  });

  // triste
  it('says down instead of throwing when the database refuses', async () => {
    const repository = repositoryWith(() => Promise.reject(new Error('CONNECTION_CLOSED')));

    await expect(repository.isDatabaseUp()).resolves.toBe(false);
  });

  /* Pergunta pendurada é o caso que o healthcheck do container não sobrevive: ele tem tempo
     limite próprio, e uma resposta que nunca chega faz o orquestrador reiniciar no escuro. */
  it('says down instead of hanging when the database never answers', async () => {
    const repository = repositoryWith(() => new Promise(() => {}));

    await expect(repository.isDatabaseUp()).resolves.toBe(false);
  }, 10_000);
});
