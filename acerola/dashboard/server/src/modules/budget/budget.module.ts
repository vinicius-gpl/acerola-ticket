import { Module } from '@nestjs/common';

import { BudgetController } from './controller/budget.controller';
import { BudgetRepository } from './repository/budget.repository';
import { BudgetService } from './service/budget.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 * Módulo novo precisa ser registrado em `app.module.ts` — esquecer é o motivo nº 1 de "a
 * rota dá 404".
 */
@Module({
  controllers: [BudgetController],
  providers: [BudgetService, BudgetRepository],
})
export class BudgetModule {}
