import { boolean, pgSchema, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * O cadastro de pessoas — que é do **Neon Auth**, não nosso.
 *
 * O Neon Auth guarda usuários, sessões e chaves num schema separado do mesmo banco
 * (`neon_auth`). Esta declaração é só um ESPELHO para leitura: o sistema lê nome, e-mail e
 * papel de quem entrou, e nunca escreve aqui. Quem cria, remove e promove pessoas é o painel
 * da Neon.
 *
 * Por isso este arquivo mora FORA de `schema/` e não se chama `.schema.ts`: aquela pasta é o
 * que o `drizzle-kit` lê para gerar migrations, e tabela que não é nossa não pode entrar
 * nela. Sem esse cuidado, `npm run db:generate` tentaria criar — ou pior, apagar — o cadastro
 * de pessoas inteiro. O `drizzle.config.ts` ainda limita a geração ao schema `public`, como
 * segunda trava.
 *
 * Os nomes das colunas são em camelCase entre aspas porque foi assim que o Better Auth — o
 * motor por trás do Neon Auth — as criou. Não é o padrão do resto do projeto, e não pode ser
 * "corrigido": o nome tem que bater com o que está lá.
 */
const neonAuth = pgSchema('neon_auth');

export const neonAuthUsers = neonAuth.table('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: boolean('emailVerified'),
  image: text('image'),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }),
  /* O papel da pessoa (`user`, `manager`, `admin`), trocado no painel da Neon. Pode vir
     vazio: conta recém-criada não tem papel, e quem lê precisa tratar isso. */
  role: text('role'),
  /* Bloqueio de acesso feito no painel da Neon. Quem está banido não entra, mesmo com token
     válido na mão — o token dura 15 minutos e continuaria valendo depois do banimento. */
  banned: boolean('banned'),
  banReason: text('banReason'),
  banExpires: timestamp('banExpires', { withTimezone: true, mode: 'date' }),
});

export type NeonAuthUserRow = typeof neonAuthUsers.$inferSelect;
