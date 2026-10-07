import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { type Env } from '../config/env.schema';
import { ENV } from '../config/env.token';
import { buildLoggerOptions } from './logger.options';

/**
 * Liga o pino na API inteira: o log de cada requisição (com id) e o `Logger` do Nest, que
 * passa a escrever pelo mesmo canal — `new Logger('x').warn(...)` continua funcionando igual
 * em qualquer service, só que agora sai em JSON e com o id da requisição em curso.
 */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => buildLoggerOptions(env),
    }),
  ],
})
export class LoggingModule {}
