import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env', quiet: true });

/**
 * O `drizzle-kit` lê a MESMA variável que o server: uma fonte só para o endereço do banco.
 *
 * Diferente do `env.schema.ts`, aqui não dá para recusar a partida com uma mensagem bonita —
 * o drizzle-kit é uma ferramenta de linha de comando. Então a checagem é explícita, para
 * `npm run db:generate` sem `.env` dizer o que falta em vez de falhar dentro da biblioteca.
 */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL não definida. Copie server/.env.example para server/.env.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema/*.schema.ts',
  out: './drizzle',
  dbCredentials: { url: databaseUrl },
  /**
   * Só o schema `public` entra nas migrations.
   *
   * O banco também tem o schema `neon_auth`, criado e mantido pelo Neon Auth. Sem este
   * limite, `npm run db:generate` veria aquelas tabelas como "não declaradas" e escreveria
   * uma migration apagando o cadastro de pessoas inteiro.
   */
  schemaFilter: ['public'],
  verbose: true,
  strict: true,
});
