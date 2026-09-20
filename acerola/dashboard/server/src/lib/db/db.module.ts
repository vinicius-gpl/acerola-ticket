import { Global, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';

import { ENV } from '../config/env.token';
import { type Env } from '../config/env.schema';
import { DB } from './db.token';
import { type Database } from './db.type';
import { openDatabase, resolveDatabaseFile } from './open-database.util';

/** Guardado à parte do provider para o desligamento conseguir fechar o arquivo. */
let close: (() => void) | null = null;

/**
 * Uma conexão para o processo inteiro.
 *
 * Global porque todo repository precisa dela, e porque ter UMA é parte da garantia: o SQLite
 * aceita um escritor por vez, e duas conexões do mesmo processo disputando o arquivo viram
 * "database is locked" sob carga.
 */
@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [ENV],
      useFactory: (env: Env): Database => {
        const opened = openDatabase(env.DATABASE_FILE);
        close = opened.close;

        new Logger(DbModule.name).log(`SQLite em ${resolveDatabaseFile(env.DATABASE_FILE)}`);

        return opened.db;
      },
    },
  ],
  exports: [DB],
})
export class DbModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DbModule.name);

  /**
   * Fechar no desligamento grava o que está no WAL de volta no arquivo principal. Sem isso,
   * copiar só o `app.db` para outra máquina levaria o banco sem as últimas escritas.
   */
  onApplicationShutdown(): void {
    if (!close) return;

    close();
    close = null;
    this.logger.log('Database connection closed.');
  }
}
