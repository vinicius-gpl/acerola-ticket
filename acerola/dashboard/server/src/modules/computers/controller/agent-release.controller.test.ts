import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { RolesGuard } from '../../../lib/auth/roles.guard';
import { type FileStorage } from '../../../lib/storage/file-storage.type';
import { STORAGE } from '../../../lib/storage/storage.token';
import { AgentReleaseRepository } from '../repository/agent-release.repository';
import { AgentReleaseService } from '../service/agent-release.service';
import { ComputersService } from '../service/computers.service';
import { AgentReleaseController } from './agent-release.controller';

// Integra a rota ao guard global real: @Public não pode virar download anônimo.
describe('agent release HTTP boundary', () => {
  let app: INestApplication;
  const authenticateAgent = vi.fn();
  const latest = vi.fn();
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AgentReleaseController],
      providers: [
        RolesGuard,
        AgentReleaseService,
        { provide: ComputersService, useValue: { authenticateAgent } },
        { provide: AgentReleaseRepository, useValue: { latest } },
        { provide: STORAGE, useValue: {} satisfies Partial<FileStorage> },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalGuards(app.get(RolesGuard, { strict: false }));
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  // triste
  it('refuses a request without machine credentials even though no human session is required', async () => {
    await request(app.getHttpServer()).get('/api/agent/releases/latest').expect(401);
  });
  it('refuses blocked machine identity', async () => {
    authenticateAgent.mockResolvedValue({ ok: false, reason: 'blocked' });
    await request(app.getHttpServer())
      .get('/api/agent/releases/latest')
      .set('Authorization', 'Bearer fixture')
      .expect(403);
  });
  // feliz
  it('returns 204 and no-store when an authenticated machine checks before first release', async () => {
    authenticateAgent.mockResolvedValue({ ok: true, computer: { id: 1 } });
    latest.mockResolvedValue(null);
    const response = await request(app.getHttpServer())
      .get('/api/agent/releases/latest')
      .set('Authorization', 'Bearer fixture')
      .expect(204);
    expect(response.headers['cache-control']).toBe('no-store');
  });
});
