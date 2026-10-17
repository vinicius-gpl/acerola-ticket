import { S3Client } from '@aws-sdk/client-s3';
import { Global, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';

import { ENV } from '../config/env.token';
import { type Env } from '../config/env.schema';
import { type FileStorage } from './file-storage.type';
import { S3Storage } from './s3-storage';
import { StagedUploadsService } from './staged-uploads.service';
import { OBJECT_STORAGE, STORAGE } from './storage.token';

/** Guardado à parte do provider para o desligamento conseguir fechar os sockets. */
let destroy: (() => void) | null = null;

/**
 * O storage do processo inteiro: o Cloudflare R2, pelo protocolo S3.
 *
 * Global pela mesma razão do banco: qualquer feature que guarde arquivo precisa dele.
 *
 * O endereço do serviço é derivado da conta (`https://<conta>.r2.cloudflarestorage.com`), e
 * não é mais uma variável de ambiente: ele é sempre essa fórmula, e torná-lo configurável só
 * criaria uma forma a mais de errar em silêncio. `region: 'auto'` porque o R2 não tem região a
 * escolher — o SDK da AWS exige o campo, e é esse o valor que a Cloudflare manda usar.
 *
 * O navegador envia e baixa DIRETO no R2, pelos links assinados que `STORAGE` emite: o bucket
 * precisa da regra de CORS descrita no `.env.example`.
 */
function r2Endpoint(env: Env): string {
  return `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

@Global()
@Module({
  providers: [
    {
      provide: STORAGE,
      inject: [ENV],
      useFactory: (env: Env): FileStorage => {
        new Logger(StorageModule.name).log(`R2 no bucket ${env.R2_BUCKET}`);

        return new S3Storage({
          bucket: env.R2_BUCKET,
          region: 'auto',
          endpoint: r2Endpoint(env),
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          forcePathStyle: false,
        });
      },
    },
    {
      provide: OBJECT_STORAGE,
      inject: [ENV],
      useFactory: (env: Env): S3Client => {
        const client = new S3Client({
          region: 'auto',
          endpoint: r2Endpoint(env),
          credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          },
        });
        destroy = () => client.destroy();

        return client;
      },
    },
    StagedUploadsService,
  ],
  exports: [STORAGE, OBJECT_STORAGE, StagedUploadsService],
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
