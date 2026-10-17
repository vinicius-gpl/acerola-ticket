import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { RolesGuard } from '../../../lib/auth/roles.guard';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { STORAGE } from '../../../lib/storage/storage.token';
import { AgentReleaseRepository } from '../repository/agent-release.repository';
import { AgentDownloadService } from '../service/agent-download.service';
import { AgentDownloadController } from './agent-download.controller';

describe('dashboard agent download HTTP boundary', () => {
  let app: INestApplication;
  let user: RequestUser | undefined;
  const latest = vi.fn().mockResolvedValue(null);
  const createDownloadUrl = vi.fn().mockResolvedValue('https://storage.example.test/signed');
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AgentDownloadController],
      providers: [
        RolesGuard,
        AgentDownloadService,
        { provide: AgentReleaseRepository, useValue: { latest } },
        { provide: STORAGE, useValue: { downloadUrl: createDownloadUrl } },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.use((req: { user?: RequestUser }, _res: unknown, next: () => void) => {
      req.user = user;
      next();
    });
    app.useGlobalGuards(app.get(RolesGuard));
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  // triste
  it('refuses anonymous access even with a machine Bearer token', async () => {
    user = undefined;
    await request(app.getHttpServer())
      .get('/api/agent/downloads/lts')
      .set('Authorization', 'Bearer fixture')
      .expect(401);
  });
  it('refuses Maintenance-only sessions without touching storage', async () => {
    user = {
      id: 'fixture',
      name: 'Pessoa',
      email: 'fixture@example.test',
      role: 'user',
      roles: { manutencao: 'admin' },
    };
    latest.mockClear();
    await request(app.getHttpServer()).get('/api/agent/downloads/lts').expect(403);
    expect(latest).not.toHaveBeenCalled();
  });
  // feliz
  it('returns 204 and no-store for a System session before promotion', async () => {
    user = {
      id: 'fixture',
      name: 'Pessoa',
      email: 'fixture@example.test',
      role: 'user',
      roles: { sistema: 'user' },
    };
    const response = await request(app.getHttpServer()).get('/api/agent/downloads/lts').expect(204);
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('issues a private download link for an authenticated read-only Infra session', async () => {
    user = {
      id: 'fixture',
      name: 'Pessoa',
      email: 'fixture@example.test',
      role: 'user',
      roles: { infra: 'user' },
    };
    const artifact = (name: string) => ({
      key: `agent/releases/1.2.3/${name}`,
      sha256: 'a'.repeat(64),
      sizeBytes: 123,
    });
    latest.mockResolvedValue({
      version: '1.2.3',
      publishedAt: '2026-10-16T12:00:00.000Z',
      artifacts: { msi: artifact('agent.msi'), certificate: artifact('publisher.cer') },
    });
    const response = await request(app.getHttpServer())
      .get('/api/agent/downloads/lts/msi?version=1.2.3')
      .expect(200);
    expect(response.body).toEqual({ version: '1.2.3', url: 'https://storage.example.test/signed' });
    expect(response.headers['cache-control']).toBe('no-store');
    createDownloadUrl.mockClear();
  });
  // triste
  it('rejects unsupported artifacts and unversioned requests', async () => {
    await request(app.getHttpServer())
      .get('/api/agent/downloads/lts/pfx?version=1.2.3')
      .expect(400);
    await request(app.getHttpServer()).get('/api/agent/downloads/lts/msi').expect(400);
    expect(createDownloadUrl).not.toHaveBeenCalled();
  });
});
