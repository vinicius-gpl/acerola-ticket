import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
import { join } from 'node:path';

import { type DatabaseExecutor } from '../../../server/src/lib/db/db.type';
import { ticketHistories } from '../../../server/src/lib/db/schema/ticket-histories.schema';
import { tickets, type TicketInsert } from '../../../server/src/lib/db/schema/tickets.schema';
import { openSeedDatabase, report } from '../seed.util';
import { timelineOf } from '../tickets/ticket-histories.data';
import { getScheduleSeed, SOFTWARE_PROJECTS_SEED, SOFTWARE_TIMELINE_SEED } from '../software-projects/software-projects.data';
import { seedSoftwareProjects } from '../software-projects/seed-software-projects';

const demoDate = (daysAgo: number, hour: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return date;
};

const SYSTEM_TICKETS_DEMO_SEED: (TicketInsert & { id: number })[] = [
  {
    id: 9001,
    area: 'sistema',
    projectId: 1,
    status: 'open',
    priority: 'high',
    requesterName: 'Demonstração 01',
    department: 'financeiro',
    problemType: 'bug',
    contactPhone: null,
    description: 'DEMO · O login retorna à tela inicial depois de salvar as preferências.',
    createdAt: demoDate(1, 9),
  },
  {
    id: 9002,
    area: 'sistema',
    projectId: 2,
    status: 'in_progress',
    priority: 'medium',
    requesterName: 'Demonstração 02',
    department: 'comercial',
    problemType: 'feature_request',
    contactPhone: null,
    assignee: 'Equipe de Sistemas (demo)',
    description: 'DEMO · Adicionar filtro por período na lista de processos.',
    createdAt: demoDate(2, 10),
    startedAt: demoDate(1, 11),
    updatedAt: demoDate(1, 11),
    updatedBy: 'demo@azuos.local',
  },
  {
    id: 9003,
    area: 'sistema',
    projectId: 5,
    status: 'waiting_requester',
    priority: 'low',
    requesterName: 'Demonstração 03',
    department: 'rh',
    problemType: 'access_request',
    contactPhone: null,
    assignee: 'Equipe de Sistemas (demo)',
    description: 'DEMO · Solicitação de acesso ao painel de relatórios.',
    createdAt: demoDate(3, 9),
    startedAt: demoDate(2, 10),
    updatedAt: demoDate(1, 14),
    updatedBy: 'demo@azuos.local',
  },
  {
    id: 9004,
    area: 'sistema',
    projectId: 7,
    status: 'resolved',
    priority: 'medium',
    requesterName: 'Demonstração 04',
    department: 'fiscal',
    problemType: 'data_correction',
    contactPhone: null,
    assignee: 'Equipe de Sistemas (demo)',
    solution: 'DEMO · Validação e correção concluídas.',
    description: 'DEMO · Um campo do cadastro está exibindo a competência incorreta.',
    createdAt: demoDate(5, 9),
    startedAt: demoDate(5, 10),
    resolvedAt: demoDate(4, 12),
    updatedAt: demoDate(4, 12),
    updatedBy: 'demo@azuos.local',
  },
  {
    id: 9005,
    area: 'sistema',
    projectId: 8,
    status: 'open',
    priority: 'low',
    requesterName: 'Demonstração 05',
    department: 'contabil',
    problemType: 'other',
    contactPhone: null,
    description: 'DEMO · Solicitação de melhoria visual na tela de acompanhamento.',
    createdAt: demoDate(0, 8),
  },
  {
    id: 9006,
    area: 'sistema',
    projectId: 11,
    status: 'in_progress',
    priority: 'high',
    requesterName: 'Demonstração 06',
    department: 'paralegal',
    problemType: 'bug',
    contactPhone: null,
    assignee: 'Equipe de Sistemas (demo)',
    description: 'DEMO · A exportação CSV omite itens da última página.',
    createdAt: demoDate(2, 8),
    startedAt: demoDate(1, 9),
    updatedAt: demoDate(1, 9),
    updatedBy: 'demo@azuos.local',
  },
];

const RESET_TABLES = [
  'computer_alerts',
  'computer_samples',
  'computer_transfers',
  'computers',
  'github_oauth_states',
  'inventory_items',
  'inventory_movements',
  'maintenance_quotes',
  'maintenances',
  'network_events',
  'part_movements',
  'parts',
  'software_projects',
  'software_schedule_events',
  'software_timeline_events',
  'tasks',
  'ticket_areas',
  'ticket_attachments',
  'ticket_histories',
  'ticket_service_orders',
  'tickets',
] as const;

async function clearR2Bucket(): Promise<number> {
  config({ path: join(process.cwd(), 'server/.env'), quiet: true });
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket)
    throw new Error('Credenciais ou bucket do R2 ausentes; objetos não foram removidos.');

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  let deleted = 0;
  let continuationToken: string | undefined;

  try {
    do {
      const page = await client.send(
        new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }),
      );
      const objects = (page.Contents ?? [])
        .map(({ Key }) => (Key ? { Key } : null))
        .filter((object): object is { Key: string } => object !== null);

      if (objects.length > 0) {
        const response = await client.send(
          new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects, Quiet: true } }),
        );
        if (response.Errors?.length)
          throw new Error(`O R2 recusou a remoção de ${response.Errors.length} objeto(s).`);
        deleted += objects.length;
      }
      continuationToken = page.NextContinuationToken;
    } while (continuationToken);
  } finally {
    client.destroy();
  }

  return deleted;
}

async function seedSystemTickets(tx: DatabaseExecutor): Promise<void> {
  await tx.insert(tickets).values(SYSTEM_TICKETS_DEMO_SEED);
  const histories = SYSTEM_TICKETS_DEMO_SEED.flatMap(timelineOf);
  await tx.insert(ticketHistories).values(histories);
  await tx.execute(
    sql`select setval(pg_get_serial_sequence('tickets', 'id'), coalesce((select max(id) from tickets), 0) + 1, false)`,
  );
  await tx.execute(
    sql`select setval(pg_get_serial_sequence('ticket_histories', 'id'), coalesce((select max(id) from ticket_histories), 0) + 1, false)`,
  );
}

async function main(): Promise<void> {
  if (!process.argv.includes('--confirm-reset'))
    throw new Error('Refusing to reset Neon without the explicit --confirm-reset flag.');

  const { db, close } = await openSeedDatabase();
  let removedObjects = 0;

  try {
    await db.transaction(async (tx) => {
      const tableList = RESET_TABLES.map((table) => `public."${table}"`).join(', ');
      await tx.execute(sql.raw(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`));
      await seedSoftwareProjects(tx);
      await seedSystemTickets(tx);
      report('projetos da organização', SOFTWARE_PROJECTS_SEED.length);
      report('eventos de timeline pré-carregados (a sincronização vem do GitHub)', SOFTWARE_TIMELINE_SEED.length);
      report('compromissos de demonstração', getScheduleSeed().length);
      report('chamados do kanban de Sistema', SYSTEM_TICKETS_DEMO_SEED.length);
    });

    removedObjects = await clearR2Bucket();
    report('objetos removidos do R2', removedObjects);
  } finally {
    await close();
  }

  console.log('Neon limpo e módulo Sistema populado com dados de demonstração.');
}

void main();
