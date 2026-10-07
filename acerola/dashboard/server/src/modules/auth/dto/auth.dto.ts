import { authConfigSchema } from '@template/shared/schemas/auth.schema';
import { sessionUserSchema } from '@template/shared/schemas/user.schema';
import { createZodDto } from 'nestjs-zod';

/**
 * Quem está logado, no formato que a tela espera. Nasce do MESMO schema que a web importa —
 * o contrato publicado no Swagger e o que a tela lê não têm como divergir.
 */
export class SessionUserDto extends createZodDto(sessionUserSchema) {}

/** Configuração pública para inicialização do cliente Neon Auth. */
export class AuthConfigDto extends createZodDto(authConfigSchema) {}

