import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { InsightQueryDto, InsightsDto } from '../dto/insight.dto';
import { InsightsService } from '../service/insights.service';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service, e as réguas
 * vivem no domínio.
 *
 * Uma rota só, e só de leitura: a Inteligência não cria nada — ela lê o que as outras áreas
 * registraram e diz o que isso significa junto.
 */
@ApiTags('Inteligência')
@Controller('insights')
export class InsightsController {
  constructor(private readonly service: InsightsService) {}

  @Get()
  @ApiOperation({
    summary: 'O que os dados juntos dizem sobre o parque',
    description:
      'Máquinas sobrecarregadas (pela MÉDIA do período, não pelo pico), quem precisa de upgrade, quem já deu trabalho demais e o que está de reserva. Tudo calculado a cada consulta. `days` recorta o período (30 por padrão).',
  })
  @ApiOkResponse({ type: InsightsDto })
  async summary(
    @CurrentUser() user: RequestUser,
    @Query() query: InsightQueryDto,
  ): Promise<InsightsDto> {
    return this.service.summary(user, query);
  }
}
