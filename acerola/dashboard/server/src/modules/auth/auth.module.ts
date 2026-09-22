import { Module } from '@nestjs/common';

import { AuthController } from './controller/auth.controller';

/** Só a pergunta "quem sou eu": login e logout acontecem no Neon Auth, fora da API. */
@Module({
  controllers: [AuthController],
})
export class AuthApiModule {}
