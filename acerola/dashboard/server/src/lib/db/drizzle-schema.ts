import { neonAuthUsers } from './neon-auth-user.table';
import { computerAlerts } from './schema/computer-alerts.schema';
import { computerSamples } from './schema/computer-samples.schema';
import { computerTransfers } from './schema/computer-transfers.schema';
import { computers } from './schema/computers.schema';
import { maintenances } from './schema/maintenances.schema';
import { networkEvents } from './schema/network-events.schema';
import { partMovements } from './schema/part-movements.schema';
import { parts } from './schema/parts.schema';
import { tasks } from './schema/tasks.schema';
import { tickets } from './schema/tickets.schema';

/**
 * O objeto de schema que o Drizzle exige para as consultas relacionais.
 *
 * Isto NÃO é um barril: barril é re-exportar uma pasta para esconder de onde o código vem.
 * Aqui o objeto é o dado — é o argumento que `drizzle(client, { schema })` recebe, e sem ele
 * `db.query.tasks.findMany()` não existe. Todo o resto do código continua importando a tabela
 * do arquivo dela.
 *
 * Tabela nova entra aqui, na mesma mudança em que o arquivo `<nome>.schema.ts` é criado.
 */
export const drizzleSchema = {
  tasks,
  tickets,
  computers,
  computerSamples,
  computerAlerts,
  computerTransfers,
  maintenances,
  parts,
  partMovements,
  networkEvents,
  /* Tabela do Neon Auth, só para leitura — ver `neon-auth-user.table.ts`. */
  neonAuthUsers,
};

export type DrizzleSchema = typeof drizzleSchema;
