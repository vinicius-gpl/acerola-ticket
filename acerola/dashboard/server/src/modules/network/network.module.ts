import { Module } from '@nestjs/common';

import { NetworkController } from './controller/network.controller';
import { NetworkRepository } from './repository/network.repository';
import { NetworkService } from './service/network.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 * Módulo novo precisa ser registrado em `app.module.ts` — esquecer é o motivo nº 1 de "a
 * rota dá 404".
 */
@Module({
  controllers: [NetworkController],
  providers: [NetworkService, NetworkRepository],
  exports: [NetworkService],
})
export class NetworkModule {}
