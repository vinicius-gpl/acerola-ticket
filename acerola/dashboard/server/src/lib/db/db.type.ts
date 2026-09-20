import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import { type DrizzleSchema } from './drizzle-schema';

/** O tipo da conexão, para os repositories não repetirem o genérico do Drizzle. */
export type Database = BetterSQLite3Database<DrizzleSchema>;

/**
 * O tipo de quem executa uma consulta: a conexão OU uma transação aberta sobre ela.
 *
 * É o que permite um repository ser chamado dentro e fora de transação sem duplicar método.
 * Sem isso, toda escrita que precisa de mais de uma tabela viraria duas versões do mesmo
 * código — e é entre duas versões do mesmo código que a regra se perde.
 *
 * Atenção ao SQLite: a transação do `better-sqlite3` é SÍNCRONA. A função passada para
 * `db.transaction(...)` não pode ter `await` dentro — se tiver, a transação fecha antes da
 * escrita acontecer.
 */
export type DatabaseExecutor = Database | Parameters<Parameters<Database['transaction']>[0]>[0];
