import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ZodValidationPipe } from 'nestjs-zod';

import { AuthModule } from './lib/auth/auth.module';
import { AppConfigModule } from './lib/config/app-config.module';
import { DbModule } from './lib/db/db.module';
import { StorageModule } from './lib/storage/storage.module';
import { AuthApiModule } from './modules/auth/auth.module';
import { ComputersModule } from './modules/computers/computers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MaintenancesModule } from './modules/maintenances/maintenances.module';
import { PartsModule } from './modules/parts/parts.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TicketsModule } from './modules/tickets/tickets.module';

/**
 * Serve o build do client — sem Nginx, sem container à parte. Atrás do Traefik, esta
 * imagem responde `/` (SPA) e `/api` (Nest) sozinha. Em desenvolvimento a pasta não existe
 * (o Vite serve o client em :5176), e o `express.static` por baixo simplesmente devolve 404
 * em silêncio — não derruba o boot.
 */
const CLIENT_DIST = join(__dirname, '..', '..', 'client', 'dist');

/**
 * O pipe de validação é global: requisição com corpo fora do contrato é recusada antes de
 * chegar ao controller, e a resposta nomeia o campo. Dizer "dados inválidos" sem dizer qual
 * campo obriga a pessoa a adivinhar, e ela desiste antes de acertar.
 *
 * MÓDULO NOVO ENTRA NA LISTA DE `imports`. Esquecer é o motivo nº 1 de "a rota dá 404".
 */
@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: CLIENT_DIST,
      exclude: ['/api/{*path}', '/docs', '/docs-json'],
    }),
    AppConfigModule,
    /* `@Global` só vale a partir do momento em que o módulo é registrado UMA vez. Sem esta
       linha o token `DB` não existe em lugar nenhum, e todo repository falha na injeção. */
    DbModule,
    /* Mesma razão do DbModule: `@Global` só passa a valer depois de registrado aqui. */
    StorageModule,
    AuthModule,
    AuthApiModule,
    TasksModule,
    TicketsModule,
    ComputersModule,
    MaintenancesModule,
    PartsModule,
    DashboardModule,
  ],
  providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
})
export class AppModule {}
