import { tasks } from './schema/tasks.schema';

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
};

export type DrizzleSchema = typeof drizzleSchema;
