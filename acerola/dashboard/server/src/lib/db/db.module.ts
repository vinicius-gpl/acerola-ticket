import { Global, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';

import { ENV } from '../config/env.token';
import { type Env } from '../config/env.schema';
import { DB } from './db.token';
import { type Database } from './db.type';
import { describeDatabaseUrl, openDatabase } from './open-database.util';

/** Guardado à parte do provider para o desligamento conseguir encerrar a conexão. */
let close: (() => Promise<void>) | null = null;

/**
 * Uma conexão para o processo inteiro.
 *
 * Global porque todo repository precisa dela. Ter UMA também importa no Postgres hospedado,
 * só que por outro motivo que no SQLite: a Neon cobra por conexão aberta, e um pool por
 * módulo multiplicaria isso sem o sistema ficar mais rápido.
 */
@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [ENV],
      useFactory: async (env: Env): Promise<Database> => {
        const opened = await openDatabase(env.DATABASE_URL);
        close = opened.close;

        new Logger(DbModule.name).log(`Postgres em ${describeDatabaseUrl(env.DATABASE_URL)}`);

        return opened.db;
      },
    },
  ],
  exports: [DB],
})
export class DbModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DbModule.name);

  /**
   * Encerrar a conexão no desligamento devolve o assento no pool do servidor. Sem isso, um
   * processo reiniciado várias vezes vai acumulando conexões zumbis até a Neon recusar novas.
   */
  async onApplicationShutdown(): Promise<void> {
    if (!close) return;

    await close();
    close = null;
    this.logger.log('Database connection closed.');
  }
}
