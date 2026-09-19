import { type INestApplication } from '@nestjs/common';

import { type Env } from './lib/config/env.schema';
import { HttpExceptionFilter } from './lib/http/http-exception.filter';

/**
 * O que toda instância da API precisa ter — a de verdade e a dos testes E2E.
 *
 * Mora fora do `main.ts` para o teste subir a MESMA aplicação que vai para o ar. Um E2E que
 * monta prefixo e filtro por conta própria testa uma API parecida, e é na diferença entre as
 * duas que o defeito passa.
 */
export function setupApp(app: INestApplication, env: Env): void {
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: env.API_CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
  });
  /* A validação é o `ZodValidationPipe`, registrado como pipe global no AppModule. O
     `ValidationPipe` do Nest não entra aqui: ele exige `class-validator`, e ter dois
     validadores significaria dois lugares definindo o contrato — exatamente o que o schema
     único em `shared` existe para impedir. */
  app.useGlobalFilters(new HttpExceptionFilter());
}
