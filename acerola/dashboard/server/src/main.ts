import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
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

  /* O ADAPTADOR DE WEBSOCKET, para os agentes conectarem em `/agent`.
     É `ws` puro, não Socket.IO: o protocolo é bem mais simples de falar a partir de um cliente
     em Go, que é o que o agente é. Fica aqui, e não em `app.setup.ts`, porque aquele arquivo é
     estrutura protegida do projeto — e porque os testes E2E de HTTP não precisam do adaptador. */
  app.useWebSocketAdapter(new WsAdapter(app));

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
            'Quem autentica é o **Neon Auth**, não esta API: a tela manda e-mail e senha direto para lá e recebe um token assinado.',
            '',
            'Toda requisição precisa apresentar esse token em `Authorization: Bearer <token>`. O servidor confere a assinatura pela chave pública da Neon (JWKS) e lê o papel da pessoa no cadastro (`neon_auth.user`) a cada chamada — papel trocado ou conta banida no painel valem na requisição seguinte.',
            '',
            'Sem token, ou com token vencido, inválido ou de conta que não existe mais: 401.',
          ].join('\n'),
        )
        .setVersion('0.1.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description:
              'O token que o Neon Auth entrega à tela depois do login. Para experimentar aqui, faça login no sistema e copie o token da chamada que o navegador já faz.',
          },
          'neon-auth',
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
