import { asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { softwareProjects } from '../src/lib/db/schema/software-projects.schema';
import { softwareTimelineEvents } from '../src/lib/db/schema/software-timeline-events.schema';
import { SoftwareTimelineRepository } from '../src/modules/software-projects/repository/software-timeline.repository';
import { createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * A gravação EM LOTE da sincronização do GitHub, contra um Postgres de verdade.
 *
 * O que só quebra aqui: o `on conflict` depende do índice único existir na migration, e a
 * troca de "já existe? então atualiza" por uma consulta só precisa continuar não duplicando
 * nada quando o mesmo PR chega duas vezes — nenhum teste com o repositório falso prova isso.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)('Software timeline batch upsert (e2e)', () => {
  let started: E2eApp;
  let repository: SoftwareTimelineRepository;
  let projectId: number;

  const pr = (externalId: string, overrides: Record<string, unknown> = {}) => ({
    projectId,
    type: 'pr' as const,
    externalId,
    title: `PR ${externalId}`,
    url: `https://github.com/org/repo/pull/${externalId.slice(1)}`,
    author: 'ana',
    authorName: 'Ana Lima',
    status: 'open' as const,
    eventDate: new Date('2026-10-16T12:00:00Z'),
    createdBy: 'primeira@empresa.com.br',
    ...overrides,
  });

  const stored = () =>
    started.db
      .select()
      .from(softwareTimelineEvents)
      .where(eq(softwareTimelineEvents.projectId, projectId))
      .orderBy(asc(softwareTimelineEvents.externalId));

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!);
    repository = new SoftwareTimelineRepository(started.db);
  });

  beforeEach(async () => {
    await started.truncate('software_timeline_events', 'software_projects');
    const [project] = await started.db
      .insert(softwareProjects)
      .values({ name: 'Chamados', repositoryUrl: 'org/repo', createdBy: 'ti@empresa.com.br' })
      .returning();
    projectId = project!.id;
  });

  afterAll(async () => {
    await started.app.close();
  });

  // feliz
  it('updates what already exists and inserts what is new, without duplicating', async () => {
    await repository.upsertMany([pr('#1'), pr('#2')]);

    await repository.upsertMany([
      pr('#2', { status: 'merged', title: 'PR #2 mergeado', createdBy: 'segunda@empresa.com.br' }),
      pr('#3'),
    ]);

    const rows = await stored();
    expect(rows.map((row) => row.externalId)).toEqual(['#1', '#2', '#3']);
    expect(rows[1]).toMatchObject({ status: 'merged', title: 'PR #2 mergeado' });
    /* Atualizar não reescreve a autoria de quem gravou primeiro. */
    expect(rows[1]?.createdBy).toBe('primeira@empresa.com.br');
  });

  // feliz
  /* Mais de um lote (500 por consulta) continua gravando tudo. */
  it('writes every row when the list is bigger than one batch', async () => {
    const many = Array.from({ length: 1_203 }, (_, index) => pr(`#${index + 1}`));

    await repository.upsertMany(many);
    await repository.upsertMany(many);

    expect(await stored()).toHaveLength(1_203);
  });

  // triste
  /* PR e issue com o mesmo número são coisas diferentes no GitHub: nenhum sobrescreve o outro. */
  it('keeps a pull request and an issue that share the same number', async () => {
    await repository.upsertMany([pr('#7'), pr('#7', { type: 'issue', title: 'Issue #7' })]);

    const rows = await stored();
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.type).sort()).toEqual(['issue', 'pr']);
  });

  // triste
  /* O mesmo PR duas vezes na mesma leva (alterado enquanto as páginas eram lidas): vale a última. */
  it('accepts the same pull request twice in one call, keeping the last version', async () => {
    await repository.upsertMany([pr('#9'), pr('#9', { status: 'merged' })]);

    const rows = await stored();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe('merged');
  });

  // triste
  it('does nothing for an empty list', async () => {
    await expect(repository.upsertMany([])).resolves.toBe(0);
    expect(await stored()).toHaveLength(0);
  });
});
