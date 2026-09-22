import { Module } from '@nestjs/common';

import { AuthController } from './controller/auth.controller';
import { AuthRepository } from './repository/auth.repository';
import { AuthService } from './service/auth.service';

/**
 * O índice da pasta. Não confundir com `lib/auth/auth.module.ts`: aquele é a INFRAESTRUTURA
 * transversal (middleware + guard, para toda rota); este é a FEATURE de login em si
 * (`/api/auth/login`, `/logout`, `/me`) — o mesmo tipo de módulo que `TasksModule`.
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository],
})
export class AuthModule {}
