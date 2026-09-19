import {
  createTaskSchema,
  taskListQuerySchema,
  taskSchema,
  updateTaskSchema,
} from '@template/shared/schemas/task.schema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Os DTOs nascem dos MESMOS schemas Zod que a web importa. É o que garante que a validação
 * em runtime e o contrato publicado no Swagger não possam divergir — quando divergem, a tela
 * manda um campo que o servidor ignora em silêncio.
 */
export class TaskListQueryDto extends createZodDto(taskListQuerySchema) {}
export class CreateTaskDto extends createZodDto(createTaskSchema) {}
export class UpdateTaskDto extends createZodDto(updateTaskSchema) {}
export class TaskDto extends createZodDto(taskSchema) {}

export class TaskListResponseDto extends createZodDto(
  z.object({
    items: z.array(taskSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
) {}
