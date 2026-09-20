import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { parseEnv, type Env } from './env.schema';
import { ENV } from './env.token';

/**
 * Global porque praticamente todo módulo precisa de alguma variável, e importar o
 * ConfigModule em cada um só criaria ruído.
 *
 * O `validate` do ConfigModule é quem faz o processo NÃO subir com ambiente inválido; o
 * provider abaixo entrega o mesmo objeto já tipado, para que ninguém precise ler
 * `process.env` à mão e reintroduzir `string | undefined` no meio do código.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env'],
      validate: (raw: Record<string, unknown>) => parseEnv(raw as NodeJS.ProcessEnv),
    }),
  ],
  providers: [
    {
      provide: ENV,
      useFactory: (): Env => parseEnv(process.env),
    },
  ],
  exports: [ENV],
})
export class AppConfigModule {}
