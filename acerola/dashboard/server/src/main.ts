import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import { parseEnv } from './lib/config/env.schema';
import { listenOnFirstFreePort } from './lib/http/listen.util';

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
        .setTitle('acerola-ticket')
        .setDescription(
          [
            'API do acerola-ticket.',
            '',
            'Duas convenções que valem para toda a API:',
            '',
            '- **Autoria vem da identidade, não do corpo.** Campos como `createdBy` e `updatedBy` são carimbados pelo servidor e ignorados se enviados na requisição.',
            '- **Edição é parcial.** Campo ausente fica como está; campo enviado como nulo é limpo.',
            '',
            '## Autenticação',
            '',
            'Duas formas de chegar autenticado, nesta ordem de prioridade:',
            '',
            '1. **Login próprio** — `POST /api/auth/login` com e-mail e senha abre uma sessão e grava um cookie `HttpOnly`. É o caminho normal pela tela.',
            '2. **Cabeçalhos encaminhados** (`auth-forward`) — quando o projeto fica atrás de um proxy que já autenticou a pessoa, ele injeta `x-forwarded-user-id`, `x-forwarded-user-email`, `x-forwarded-user-name` e `x-forwarded-user-role`.',
            '',
            'Uma requisição sem sessão e sem cabeçalhos recebe 401 (exceto `/api/auth/login`, que precisa ficar acessível para abrir a primeira sessão). Cabeçalhos presentes e malformados são recusados com 401, mesmo que haja uma sessão de cookie válida — nunca completa o que faltou.',
          ].join('\n'),
        )
        .setVersion('0.1.0')
        /* Não é `addBearerAuth`: o login de verdade autentica por cookie, que o navegador já
           manda sozinho. O "Authorize" do Swagger só precisa oferecer o caminho alternativo,
           de quem está experimentando a API como se fosse o auth-forward. */
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

  /* Porta ocupada não derruba a partida: o server procura a próxima livre. Ver listen.util. */
  const port = await listenOnFirstFreePort((candidate) => app.listen(candidate), env.API_PORT);

  const logger = new Logger('bootstrap');
  logger.log(`API em http://localhost:${port}/api`);
  logger.log(`Swagger em http://localhost:${port}/docs`);

  /* O aviso é alto de propósito: o Vite encaminha `/api` para a porta que ESPERA encontrar
     (3333, ou VITE_API_PORT). Se a API mudou de porta e ninguém avisar o client, a tela abre
     e toda requisição falha como "erro de rede" — o sintoma menos informativo que existe. */
  if (port !== env.API_PORT) {
    logger.warn(
      `A porta ${env.API_PORT} estava ocupada; a API subiu na ${port}. ` +
        `Para a tela achar a API, ponha VITE_API_PORT=${port} no client/.env e reinicie o Vite.`,
    );
  }
}

function logLevels(
  level: 'debug' | 'log' | 'warn' | 'error',
): ('debug' | 'log' | 'warn' | 'error')[] {
  const order = ['debug', 'log', 'warn', 'error'] as const;

  return order.slice(order.indexOf(level));
}

void bootstrap();
