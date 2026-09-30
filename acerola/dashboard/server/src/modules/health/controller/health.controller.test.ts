import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { healthStatusSchema } from '@template/shared/schemas/health.schema';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import { HealthRepository } from '../repository/health.repository';
import { HealthService } from '../service/health.service';
import { HealthController } from './health.controller';

/**
 * O STATUS HTTP é o que o Traefik lê — não o corpo. Um 200 com `status: down` dentro passaria
 * por saudável, e o container ficaria no ar sem banco, servindo erro a todo mundo. Por isso o
 * teste é sobre o número, e sobe uma aplicação de verdade para obtê-lo.
 */
async function appWithDatabase(isDatabaseUp: boolean): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [
      HealthService,
      { provide: HealthRepository, useValue: { isDatabaseUp: () => Promise.resolve(isDatabaseUp) } },
    ],
  }).compile();

  const app = moduleRef.createNestApplication({ logger: false });
  await app.init();

  return app;
}

describe('HealthController', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  // feliz
  it('answers 200 with the database up', async () => {
    app = await appWithDatabase(true);

    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toMatchObject({ status: 'ok', database: 'up' });
    /* O corpo respeita o contrato publicado: quem monitora lê os mesmos campos do Swagger. */
    expect(healthStatusSchema.safeParse(response.body).success).toBe(true);
  });

  // triste
  it('answers 503 with the database down, so the container gets restarted', async () => {
    app = await appWithDatabase(false);

    const response = await request(app.getHttpServer()).get('/health').expect(503);

    expect(response.body).toMatchObject({ status: 'down', database: 'down' });
    expect(healthStatusSchema.safeParse(response.body).success).toBe(true);
  });
});
