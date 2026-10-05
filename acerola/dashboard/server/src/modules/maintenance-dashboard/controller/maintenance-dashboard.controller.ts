import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { MaintenanceDashboardDto } from '../dto/maintenance-dashboard.dto';
import { MaintenanceDashboardService } from '../service/maintenance-dashboard.service';

/** O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service. */
@ApiTags('Painel da Manutenção')
@Controller('maintenance-dashboard')
export class MaintenanceDashboardController {
  constructor(private readonly service: MaintenanceDashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Resume o inventário, o depósito e os orçamentos da Manutenção',
    description:
      'Produtos cadastrados e sem estoque, orçamentos aguardando decisão, o que foi aprovado e descartado nos últimos 30 dias e os últimos movimentos do depósito.',
  })
  @ApiOkResponse({ type: MaintenanceDashboardDto })
  async summary(@CurrentUser() user: RequestUser): Promise<MaintenanceDashboardDto> {
    return this.service.summary(user);
  }
}
