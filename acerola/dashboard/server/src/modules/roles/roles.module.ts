import { Module } from '@nestjs/common';

import { RolesController } from './controller/roles.controller';
import { RolesRepository } from './repository/roles.repository';
import { RolesService } from './service/roles.service';

/**
 * Módulo de cargos internos.
 * Permite que administradores gerenciem papéis/cargos desacoplados do mecanismo de autenticação.
 */
@Module({
  controllers: [RolesController],
  providers: [RolesService, RolesRepository],
  exports: [RolesService, RolesRepository],
})
export class RolesModule {}
