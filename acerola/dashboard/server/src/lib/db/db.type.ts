import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { type DrizzleSchema } from './drizzle-schema';

/** O tipo da conexão, para os repositories não repetirem o genérico do Drizzle. */
export type Database = PostgresJsDatabase<DrizzleSchema>;

/**
 * O tipo de quem executa uma consulta: a conexão OU uma transação aberta sobre ela.
 *
 * É o que permite um repository ser chamado dentro e fora de transação sem duplicar método.
 * Sem isso, toda escrita que precisa de mais de uma tabela viraria duas versões do mesmo
 * código — e é entre duas versões do mesmo código que a regra se perde.
 *
 * Diferente do SQLite, a transação do Postgres é ASSÍNCRONA: a função passada para
 * `db.transaction(...)` pode e deve usar `await`. Código escrito na época do SQLite evitava
 * `await` ali dentro por obrigação, não por escolha — agora não precisa mais.
 */
export type DatabaseExecutor = Database | Parameters<Parameters<Database['transaction']>[0]>[0];
