import { resolve } from 'node:path';

import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env', quiet: true });

/**
 * O mesmo padrão do `env.schema.ts`: sem `.env`, vale o arquivo de sempre. O caminho é
 * resolvido a partir desta pasta (`server/`), que é de onde o `drizzle-kit` roda.
 */
const databaseFile = resolve(process.env.DATABASE_FILE ?? './data/app.db');

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/lib/db/schema/*.schema.ts',
  out: './drizzle',
  dbCredentials: { url: databaseFile },
  verbose: true,
  strict: true,
});
