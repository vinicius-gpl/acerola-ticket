import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  CreateSoftwareProjectDto,
  SoftwareProjectDto,
  SoftwareProjectListQueryDto,
  SoftwareProjectListResponseDto,
  UpdateSoftwareProjectDto,
} from '../dto/software-project.dto';
import {
  type GithubSyncAllResult,
  SoftwareProjectsService,
} from '../service/software-projects.service';
import { UseGuards } from '@nestjs/common';
import { GithubLinkedGuard } from '../../github-integration/github-linked.guard';
import { ModuleContext } from '../../../lib/auth/module-context.decorator';

@ApiTags('Sistemas e Projetos de Software')
@ModuleContext('sistema')
@Controller('software-projects')
@UseGuards(GithubLinkedGuard)
export class SoftwareProjectsController {
  constructor(private readonly service: SoftwareProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os sistemas de software cadastrados' })
  @ApiOkResponse({ type: SoftwareProjectListResponseDto })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: SoftwareProjectListQueryDto,
  ): Promise<SoftwareProjectListResponseDto> {
    return this.service.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Abre um sistema de software por ID' })
  @ApiOkResponse({ type: SoftwareProjectDto })
  @ApiNotFoundResponse({ description: 'Sistema não encontrado.' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SoftwareProjectDto> {
    return this.service.findById(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um novo sistema de software' })
  @ApiCreatedResponse({ type: SoftwareProjectDto })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateSoftwareProjectDto,
  ): Promise<SoftwareProjectDto> {
    return this.service.create(user, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um sistema de software existente' })
  @ApiOkResponse({ type: SoftwareProjectDto })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSoftwareProjectDto,
  ): Promise<SoftwareProjectDto> {
    return this.service.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui um sistema de software' })
  @ApiNoContentResponse({ description: 'Sistema excluído.' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.service.remove(user, id);
  }

  @Post('sync-github')
  @ApiOperation({
    summary: 'Sincroniza PRs e issues de TODOS os sistemas com o GitHub',
    description:
      'Exclusivo de Super Administrador. Busca o histórico inteiro de cada repositório; um sistema que falhar não impede os outros, e a resposta lista quais ficaram para trás. A mesma sincronização roda sozinha toda meia-noite (Brasília), olhando só as últimas 48 horas.',
  })
  @ApiOkResponse()
  async syncAllGithub(@CurrentUser() user: RequestUser): Promise<GithubSyncAllResult> {
    return this.service.syncAllGithub(user);
  }

  @Post(':id/sync-github')
  @ApiOperation({ summary: 'Sincroniza os Pull Requests do GitHub com a timeline do projeto' })
  @ApiOkResponse()
  async syncGithub(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ synced: number; message: string }> {
    return this.service.syncGithubPrs(user, id);
  }
}
