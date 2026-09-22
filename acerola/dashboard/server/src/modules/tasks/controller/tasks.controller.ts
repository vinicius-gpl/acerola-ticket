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
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { Roles } from '../../../lib/auth/roles.decorator';
import {
  CreateTaskDto,
  TaskDto,
  TaskListQueryDto,
  TaskListResponseDto,
  UpdateTaskDto,
} from '../dto/task.dto';
import { TasksService } from '../service/tasks.service';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service.
 *
 * Swagger é obrigatório (CONTRIBUTING §8): todo endpoint tem `@ApiOperation` e o tipo de
 * resposta. A documentação fica em http://localhost:3336/docs.
 */
@ApiTags('Tarefas')
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista tarefas',
    description: 'Da mais nova para a mais antiga. A busca procura no título e na descrição.',
  })
  @ApiOkResponse({ type: TaskListResponseDto })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: TaskListQueryDto,
  ): Promise<TaskListResponseDto> {
    return this.service.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Abre uma tarefa' })
  @ApiOkResponse({ type: TaskDto })
  @ApiNotFoundResponse({ description: 'Tarefa não encontrada.' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TaskDto> {
    return this.service.findById(user, id);
  }

  @Post()
  @Roles('admin', 'editor')
  @ApiOperation({
    summary: 'Cadastra uma tarefa',
    description:
      'Quem cadastrou é carimbado pelo servidor; `createdBy` enviado no corpo é ignorado.',
  })
  @ApiCreatedResponse({ type: TaskDto })
  @ApiUnprocessableEntityResponse({ description: 'Algum campo está fora do contrato.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão de edição.' })
  async create(@CurrentUser() user: RequestUser, @Body() body: CreateTaskDto): Promise<TaskDto> {
    return this.service.create(user, body);
  }

  @Patch(':id')
  @Roles('admin', 'editor')
  @ApiOperation({
    summary: 'Altera uma tarefa',
    description:
      'Só os campos enviados são alterados. Campo enviado como nulo é limpo; campo ausente fica como está.',
  })
  @ApiOkResponse({ type: TaskDto })
  @ApiNotFoundResponse({ description: 'Tarefa não encontrada.' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão de edição.' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTaskDto,
  ): Promise<TaskDto> {
    return this.service.update(user, id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclui uma tarefa',
    description: 'Não tem volta: restrito a administrador.',
  })
  @ApiNoContentResponse({ description: 'Tarefa excluída.' })
  @ApiNotFoundResponse({ description: 'Tarefa não encontrada.' })
  @ApiForbiddenResponse({ description: 'Ação restrita a administrador.' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.service.remove(user, id);
  }
}
