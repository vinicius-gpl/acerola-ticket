import { budgetSchema } from '@template/shared/schemas/budget.schema';
import { createZodDto } from 'nestjs-zod';

/**
 * Os DTOs nascem dos MESMOS schemas Zod que a web importa — é o que garante que a validação
 * em runtime e o contrato publicado no Swagger não possam divergir.
 */
export class BudgetDto extends createZodDto(budgetSchema) {}
