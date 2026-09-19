import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import { parseEnv } from './lib/config/env.schema';

async function bootstrap(): Promise<void> {
  /* O ambiente é validado ANTES de subir o servidor. Falhar na partida é barato; subir com
     valor errado faz cada requisição falhar com um erro que não aponta para o .env. */
  const env = parseEnv(process.env);

  const app = await NestFactory.create(AppModule, { logger: logLevels(env.API_LOG_LEVEL) });
  /* Fecha o banco com Ctrl+C: é o que grava o WAL de volta no arquivo principal. */
  app.enableShutdownHooks();

  setupApp(app, env);

  /* `cleanupOpenApiDoc` limpa o ruído interno dos schemas Zod do documento gerado. Sem isto
     o contrato publicado sai ilegível — e endpoint sem contrato legível reprova o CI. */
  const document = cleanupOpenApiDoc(
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Template')
        .setDescription(
          [
            'API do MVP.',
            '',
            'Duas convenções que valem para toda a API:',
            '',
            '- **Autoria vem da identidade, não do corpo.** Campos como `createdBy` e `updatedBy` são carimbados pelo servidor e ignorados se enviados na requisição.',
            '- **Edição é parcial.** Campo ausente fica como está; campo enviado como nulo é limpo.',
            '',
            '## Autenticação',
            '',
            'Esta API **não tem login**. A identidade chega pronta, do proxy que já autenticou a pessoa, nos cabeçalhos `x-forwarded-user-id`, `x-forwarded-user-email`, `x-forwarded-user-name` e `x-forwarded-user-role`.',
            '',
            'Uma requisição SEM nenhum desses cabeçalhos assume o usuário de demonstração (administrador). Uma requisição COM os cabeçalhos presentes e malformados é recusada com 401 — e nunca cai no usuário de demonstração.',
          ].join('\n'),
        )
        .setVersion('0.1.0')
        /* Não é `addBearerAuth`: não existe token para enviar. O que autentica é o conjunto
           de cabeçalhos que o proxy injeta, e é isso que o "Authorize" do Swagger oferece. */
        .addApiKey(
          {
            type: 'apiKey',
            in: 'header',
            name: 'x-forwarded-user-email',
            description:
              'E-mail de quem está pedindo. Em produção quem preenche é o proxy; aqui serve para experimentar a API como outra pessoa.',
          },
          'auth-forward',
        )
        .addApiKey(
          {
            type: 'apiKey',
            in: 'header',
            name: 'x-forwarded-user-role',
            description: 'Perfil: `admin`, `editor` ou `viewer`. Decide o que a policy permite.',
          },
          'auth-forward-role',
        )
        .build(),
    ),
  );

  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(env.API_PORT);

  const logger = new Logger('bootstrap');
  logger.log(`API em http://localhost:${env.API_PORT}/api`);
  logger.log(`Swagger em http://localhost:${env.API_PORT}/docs`);
}

function logLevels(
  level: 'debug' | 'log' | 'warn' | 'error',
): ('debug' | 'log' | 'warn' | 'error')[] {
  const order = ['debug', 'log', 'warn', 'error'] as const;

  return order.slice(order.indexOf(level));
}

void bootstrap();
