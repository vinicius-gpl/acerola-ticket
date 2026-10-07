import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { SoftwareDashboardDto } from '../dto/software-project.dto';
import { SoftwareDashboardService } from '../service/software-dashboard.service';

@ApiTags('Painel do Sistema')
@Controller('software-dashboard')
export class SoftwareDashboardController {
  constructor(private readonly service: SoftwareDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Retorna os indicadores mensais, gráficos de chamados e PRs do sistema' })
  @ApiOkResponse({ type: SoftwareDashboardDto })
  async summary(@CurrentUser() user: RequestUser): Promise<SoftwareDashboardDto> {
    return this.service.summary(user);
  }
}
