import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { Roles } from '../../../lib/auth/roles.decorator';
import { AssignRoleDto, InternalRoleDto, InternalRoleListDto } from '../dto/roles.dto';
import { RolesService } from '../service/roles.service';

/**
 * Endpoint de administração de cargos internos.
 * Apenas administradores (`admin`) possuem acesso a estas rotas.
 */
@ApiTags('Cargos')
@Controller('roles')
@Roles('admin', 'superadmin')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar cargos internos',
    description: 'Retorna todos os cargos internos atribuídos no sistema.',
  })
  @ApiOkResponse({ type: InternalRoleListDto })
  @ApiUnauthorizedResponse({ description: 'Sem token válido.' })
  @ApiForbiddenResponse({ description: 'Esta ação é de Administrador.' })
  async list(@CurrentUser() user: RequestUser): Promise<InternalRoleDto[]> {
    return this.service.list(user);
  }

  @Get('user/:identifier')
  @ApiOperation({
    summary: 'Listar cargos de uma pessoa',
    description: 'Retorna todos os cargos atribuídos para um usuário em diferentes contextos.',
  })
  @ApiOkResponse({ type: InternalRoleListDto })
  @ApiUnauthorizedResponse({ description: 'Sem token válido.' })
  @ApiForbiddenResponse({ description: 'Esta ação é de Administrador.' })
  async listByUser(
    @CurrentUser() user: RequestUser,
    @Param('identifier') identifier: string,
  ): Promise<InternalRoleDto[]> {
    return this.service.listByUser(user, identifier);
  }

  @Post()
  @Put()
  @ApiOperation({
    summary: 'Atribuir ou alterar cargo interno',
    description: 'Define o cargo de uma pessoa em um determinado contexto do sistema.',
  })
  @ApiOkResponse({ type: InternalRoleDto })
  @ApiUnauthorizedResponse({ description: 'Sem token válido.' })
  @ApiForbiddenResponse({ description: 'Esta ação é de Administrador.' })
  async assign(
    @CurrentUser() user: RequestUser,
    @Body() body: AssignRoleDto,
  ): Promise<InternalRoleDto> {
    return this.service.assign(user, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Excluir atribuição de cargo',
    description: 'Remove o cargo interno de uma pessoa naquele contexto, revertendo ao padrão restrito.',
  })
  @ApiNoContentResponse({ description: 'Cargo removido com sucesso.' })
  @ApiNotFoundResponse({ description: 'Cargo não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Sem token válido.' })
  @ApiForbiddenResponse({ description: 'Esta ação é de Administrador.' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.service.delete(user, id);
  }
}
