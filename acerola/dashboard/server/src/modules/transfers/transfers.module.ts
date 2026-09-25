import { Module } from '@nestjs/common';

import { PartsModule } from '../parts/parts.module';
import { TransfersController } from './controller/transfers.controller';
import { TransfersRepository } from './repository/transfers.repository';
import { TransfersService } from './service/transfers.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 *
 * Importa o `PartsModule` para usar o repository do depósito: o periférico que fica na
 * estação vira duas linhas no extrato, e quem sabe escrever nesse extrato — mantendo o saldo
 * de pé — é o dono dele. Uma segunda cópia dessa conta aqui começaria a discordar da primeira.
 */
@Module({
  imports: [PartsModule],
  controllers: [TransfersController],
  providers: [TransfersService, TransfersRepository],
})
export class TransfersModule {}
