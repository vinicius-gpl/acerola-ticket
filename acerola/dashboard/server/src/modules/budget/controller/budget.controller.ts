import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { BudgetDto } from '../dto/budget.dto';
import { BudgetService } from '../service/budget.service';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service, e as réguas
 * vivem no domínio.
 *
 * Uma rota só, e só de leitura. O orçamento não guarda nada: ele é a leitura de agora do
 * inventário contra o depósito.
 */
@ApiTags('Orçamento')
@Controller('budget')
export class BudgetController {
  constructor(private readonly service: BudgetService) {}

  @Get()
  @ApiOperation({
    summary: 'O que falta comprar, já descontando o depósito',
    description:
      'Para cada necessidade (memória, disco e máquina para substituir): quantas máquinas precisam, quanto o depósito tem e quantas comprar. As réguas são as mesmas da Inteligência. Preço não vem daqui — a faixa de valores é uma referência datada, do lado da tela.',
  })
  @ApiOkResponse({ type: BudgetDto })
  async summary(@CurrentUser() user: RequestUser): Promise<BudgetDto> {
    return this.service.summary(user);
  }
}
