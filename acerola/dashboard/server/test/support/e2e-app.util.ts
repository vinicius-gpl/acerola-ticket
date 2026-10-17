import { type INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';
import { type SessionUser } from '@template/shared/schemas/user.schema';
import { sql } from 'drizzle-orm';

import { AppModule } from '../../src/app.module';
import { setupApp } from '../../src/app.setup';
import { IdentityProvider } from '../../src/lib/auth/identity.provider';
import { parseEnv } from '../../src/lib/config/env.schema';
import { DB } from '../../src/lib/db/db.token';
import { type Database } from '../../src/lib/db/db.type';
import { MemoryStorage } from '../../src/lib/storage/memory-storage';
import { STORAGE } from '../../src/lib/storage/storage.token';

/**
 * O PREPARO comum dos testes de ponta a ponta da API — o que todo arquivo de E2E precisa
 * fazer igual, num lugar só.
 *
 * Vive aqui por um motivo concreto: o adaptador de WebSocket. A API tem um gateway (o canal
 * dos agentes), e o Nest MATA o processo ao subir um gateway sem adaptador. Cada arquivo que
 * lembrasse disso por conta própria seria um arquivo que um dia esquece — e o sintoma é a
 * suíte inteira morrendo sem dizer por quê.
 *
 * O que é FINGIDO aqui são só os dois serviços de fora, e pelo mesmo motivo em ambos os casos
 * (depender deles faria o teste precisar de conta de verdade, de internet e de dinheiro):
 *
 *  - **Neon Auth**, o reconhecimento do token. Conferir assinatura, papel e banimento é
 *    assunto de `identity.provider.test.ts`.
 *  - **Cloudflare R2**, onde ficam os arquivos. Vira o `MemoryStorage`: o mesmo contrato, sem
 *    rede. O teste faz o papel do navegador — pede o link à API e põe o arquivo na área
 *    temporária —, e a API confere, move e apaga de verdade.
 *
 * Tudo o mais é real: a migration sobe, a policy decide, a restrição do banco recusa e o
 * filtro de erro traduz. É o que teste com repository fingido não prova.
 */

/**
 * As pessoas dos testes, já com o que a identidade resolveria: Ana e Bia são Usuárias de
 * Infraestrutura, Caio é Gestor de Infraestrutura, e Edu tem conta mas módulo nenhum — só abre
 * chamado.
 */
export const ANA: SessionUser = {
  id: '1',
  email: 'ana@empresa.com.br',
  name: 'Ana',
  role: 'user',
  roles: { infra: 'user' },
};
export const BIA: SessionUser = {
  id: '2',
  email: 'bia@empresa.com.br',
  name: 'Bia',
  role: 'user',
  roles: { infra: 'user' },
};
export const CAIO: SessionUser = {
  id: '3',
  email: 'caio@empresa.com.br',
  name: 'Caio',
  role: 'manager',
  roles: { infra: 'manager' },
};
export const EDU: SessionUser = {
  id: '4',
  email: 'edu@empresa.com.br',
  name: 'Edu',
  role: 'user',
  roles: {},
};

/** Cada token de mentira vale por uma pessoa. O que não está aqui não é ninguém. */
const PEOPLE_BY_TOKEN: Record<string, SessionUser> = {
  'token-ana': ANA,
  'token-bia': BIA,
  'token-caio': CAIO,
  'token-edu': EDU,
};

export const asAna = () => ({ Authorization: 'Bearer token-ana' });
export const asBia = () => ({ Authorization: 'Bearer token-bia' });
export const asCaio = () => ({ Authorization: 'Bearer token-caio' });
export const asEdu = () => ({ Authorization: 'Bearer token-edu' });

class FakeIdentityProvider {
  resolve(token: string): Promise<SessionUser | null> {
    return Promise.resolve(PEOPLE_BY_TOKEN[token] ?? null);
  }
}

export type E2eApp = {
  app: INestApplication;
  /** O storage em memória: o teste põe nele o que o navegador enviaria, e confere o que sobrou
      — a regra é "sai do banco E do bucket", e sem isso metade dela ficaria sem prova. */
  storage: MemoryStorage;
  /** A conexão de verdade — para arquivos que precisam preparar dado que a API não expõe
      (ex.: cargo por área, #13), sem reinventar a conexão. */
  db: Database;
  /** Esvazia as tabelas que ESTE arquivo usa, para nenhum teste herdar o dado de outro. */
  truncate: (...tables: string[]) => Promise<void>;
};

/**
 * Sobe a API inteira contra a `TEST_DATABASE_URL`.
 *
 * `RESTART IDENTITY` no `truncate` zera o contador de `id` junto: sem isso os ids cresceriam a
 * cada execução, e qualquer asserção sobre protocolo (que é derivado do id) só passaria na
 * primeira vez.
 */
export async function createE2eApp(testDatabaseUrl: string): Promise<E2eApp> {
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.API_LOG_LEVEL = 'error';

  const storage = new MemoryStorage();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(IdentityProvider)
    .useClass(FakeIdentityProvider)
    .overrideProvider(STORAGE)
    .useValue(storage)
    .compile();

  const app = moduleRef.createNestApplication({ logger: ['error'] });
  setupApp(app, parseEnv(process.env));
  /* Sem isto o Nest tenta carregar o Socket.IO para o gateway dos agentes, não acha, e mata o
     processo — a suíte morre antes do primeiro teste. */
  app.useWebSocketAdapter(new WsAdapter(app));
  await app.init();

  const db = app.get<Database>(DB);

  const truncate = async (...tables: string[]): Promise<void> => {
    if (tables.length === 0) return;

    await db.execute(
      sql.raw(`truncate table ${tables.join(', ')} restart identity cascade`),
    );
  };

  return { app, storage, db, truncate };
}
