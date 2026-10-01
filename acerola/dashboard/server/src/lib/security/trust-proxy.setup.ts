import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import { type Env } from '../config/env.schema';
import { ENV } from '../config/env.token';

/**
 * Ensina o Express a contar os proxies da frente, para `request.ip` deixar de ser o endereço
 * do Traefik e voltar a ser o de quem realmente chamou.
 *
 * É isto que faz a trava de requisição contar a pessoa certa. Sem o ajuste, em produção todo
 * mundo chega pelo mesmo endereço e uma pessoa ocupada tranca a API para os outros.
 *
 * Roda na partida, de dentro de um módulo, porque `app.setup.ts` é estrutura protegida do
 * projeto — e porque assim o teste E2E sobe com o mesmo ajuste que vai para o ar.
 */
@Injectable()
export class TrustProxySetup implements OnApplicationBootstrap {
  private readonly logger = new Logger(TrustProxySetup.name);

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    @Inject(ENV) private readonly env: Env,
  ) {}

  onApplicationBootstrap(): void {
    const instance = this.adapterHost.httpAdapter?.getInstance<ExpressLike>();
    if (typeof instance?.set !== 'function') return;

    instance.set('trust proxy', this.env.API_TRUST_PROXY_HOPS);

    if (this.env.API_TRUST_PROXY_HOPS > 0) {
      this.logger.log(`Trusting ${this.env.API_TRUST_PROXY_HOPS} proxy hop(s) for the client IP.`);
    }
  }
}

/** O adaptador pode não ser o do Express (E2E sem HTTP, por exemplo); daí o teste acima. */
type ExpressLike = { set?: (setting: string, value: unknown) => void };
