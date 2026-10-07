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
import { SoftwareProjectsService } from '../service/software-projects.service';

@ApiTags('Sistemas e Projetos de Software')
@Controller('software-projects')
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
