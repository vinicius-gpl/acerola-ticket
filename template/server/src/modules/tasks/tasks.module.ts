import { Module } from '@nestjs/common';

import { TasksController } from './controller/tasks.controller';
import { TasksRepository } from './repository/tasks.repository';
import { TasksService } from './service/tasks.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 * Módulo novo precisa ser registrado em `app.module.ts`.
 */
@Module({
  controllers: [TasksController],
  providers: [TasksService, TasksRepository],
  exports: [TasksService],
})
export class TasksModule {}
