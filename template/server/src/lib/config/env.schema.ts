import { z } from 'zod';

/**
 * Contrato do ambiente. O processo não sobe com variável errada — falhar na partida é
 * barato; descobrir em produção que a porta estava errada custa um dia.
 *
 * TODO valor tem padrão, de propósito: o template precisa subir com `npm run dev` numa
 * máquina recém-clonada, sem ninguém ter que descobrir antes que existe um `.env` para
 * copiar. Variável nova que NÃO pode ter padrão (uma chave de API, por exemplo) entra aqui
 * sem `.default()` — e aí o processo recusa subir sem ela, dizendo o nome.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  API_PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  API_CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  API_LOG_LEVEL: z.enum(['debug', 'log', 'warn', 'error']).default('log'),

  /**
   * O arquivo do SQLite, relativo à pasta `server/`. `:memory:` abre um banco que some quando
   * o processo termina — é o que os testes E2E usam.
   *
   * Vazio é recusado em vez de cair no padrão: `DATABASE_FILE=` no `.env` é quase sempre
   * alguém que apagou o valor sem querer, e abrir um banco novo em silêncio faria parecer que
   * todos os dados sumiram.
   */
  DATABASE_FILE: z
    .string()
    .trim()
    .min(1, 'Informe o caminho do arquivo do banco')
    .default('./data/app.db'),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const details = result.error.issues
    .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid environment. Check .env against .env.example:\n${details}`);
}
