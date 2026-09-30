import { Injectable, type NestMiddleware } from '@nestjs/common';
import { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';

/**
 * Os cabeçalhos que dizem ao navegador o que ele NÃO deve fazer com a nossa resposta:
 * não adivinhar o tipo do arquivo (`X-Content-Type-Options`), não deixar outro site nos
 * colocar dentro de um quadro (`X-Frame-Options`), não vazar o endereço da página ao sair
 * dela (`Referrer-Policy`), e mais uma dúzia na mesma linha.
 *
 * Mora num middleware de módulo, e não no `app.setup.ts`, porque aquele arquivo é estrutura
 * protegida do projeto. Ficar no módulo tem uma vantagem própria: o teste E2E sobe a MESMA
 * aplicação, então o cabeçalho que falta aparece no teste, e não em produção.
 *
 * A POLÍTICA DE CONTEÚDO (CSP) FICA DE FORA, por enquanto. Esta imagem serve três coisas na
 * mesma porta — a API, o SPA e o Swagger em `/docs` —, e a política padrão do helmet recusa
 * o script que o Swagger escreve dentro da página: `/docs` abriria em branco. Uma CSP que
 * sirva aos três precisa ser desenhada com nonce, e isso é decisão à parte.
 */
const applyHelmet = helmet({ contentSecurityPolicy: false });

@Injectable()
export class HelmetMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    applyHelmet(request, response, next);
  }
}
