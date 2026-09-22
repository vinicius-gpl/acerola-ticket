import { loginRequestSchema } from '@template/shared/schemas/auth.schema';
import { sessionUserSchema } from '@template/shared/schemas/user.schema';
import { createZodDto } from 'nestjs-zod';

/**
 * Os DTOs nascem dos MESMOS schemas Zod que a web importa — ver CONTRIBUTING §8.
 */
export class LoginDto extends createZodDto(loginRequestSchema) {}
export class SessionUserDto extends createZodDto(sessionUserSchema) {}
