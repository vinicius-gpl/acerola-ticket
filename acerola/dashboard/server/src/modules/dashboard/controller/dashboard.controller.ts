import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { DashboardDto, DashboardQueryDto } from '../dto/dashboard.dto';
import { DashboardService } from '../service/dashboard.service';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service.
 *
 * Uma rota só, e só de leitura: o painel não cria nem altera nada — ele conta o que as outras
 * áreas registraram.
 */
@ApiTags('Painel')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'O resumo do parque no período',
    description:
      'Cruza chamados, inventário, manutenção e depósito. Tudo é calculado a cada consulta — guardar esses números daria um painel que envelhece em silêncio. `days` recorta o período (30 por padrão).',
  })
  @ApiOkResponse({ type: DashboardDto })
  async summary(
    @CurrentUser() user: RequestUser,
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardDto> {
    return this.service.summary(user, query);
  }
}
