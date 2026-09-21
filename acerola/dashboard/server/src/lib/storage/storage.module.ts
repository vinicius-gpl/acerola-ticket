import { S3Client } from '@aws-sdk/client-s3';
import { Global, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';

import { ENV } from '../config/env.token';
import { type Env } from '../config/env.schema';
import { StorageService } from './storage.service';
import { OBJECT_STORAGE } from './storage.token';

/** Guardado à parte do provider para o desligamento conseguir fechar os sockets. */
let destroy: (() => void) | null = null;

/**
 * Um cliente do R2 para o processo inteiro.
 *
 * Global pela mesma razão do banco: qualquer feature que guarde arquivo precisa dele, e o
 * cliente mantém um pool de conexões HTTPS — um por módulo multiplicaria isso sem ganho.
 *
 * O endereço do serviço é derivado da conta (`https://<conta>.r2.cloudflarestorage.com`), e
 * não é mais uma variável de ambiente: ele é sempre essa fórmula, e torná-lo configurável só
 * criaria uma forma a mais de errar em silêncio.
 *
 * `region: 'auto'` porque o R2 não tem região a escolher — o SDK da AWS exige o campo, então
 * é esse o valor que a Cloudflare manda usar.
 */
@Global()
@Module({
  providers: [
    {
      provide: OBJECT_STORAGE,
      inject: [ENV],
      useFactory: (env: Env): S3Client => {
        const client = new S3Client({
          region: 'auto',
          endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          },
        });
        destroy = () => client.destroy();

        new Logger(StorageModule.name).log(`R2 no bucket ${env.R2_BUCKET}`);

        return client;
      },
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule implements OnApplicationShutdown {
  private readonly logger = new Logger(StorageModule.name);

  onApplicationShutdown(): void {
    if (!destroy) return;

    destroy();
    destroy = null;
    this.logger.log('Object storage client closed.');
  }
}
