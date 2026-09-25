import { z } from 'zod';

/**
 * Contrato do ambiente. O processo não sobe com variável errada — falhar na partida é
 * barato; descobrir em produção que a porta estava errada custa um dia.
 *
 * Quase todo valor tem padrão, de propósito: o template precisa subir com `npm run dev` numa
 * máquina recém-clonada. As exceções são os segredos — endereço do banco e credenciais do
 * R2 —, que entram SEM `.default()`: não existe padrão razoável para um segredo, e o
 * processo recusando subir e dizendo o nome da variável é melhor do que ele subir e falhar
 * na primeira gravação.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  API_PORT: z.coerce.number().int().min(1).max(65535).default(3005),
  API_CORS_ORIGIN: z.string().min(1).default('http://localhost:5005'),
  API_LOG_LEVEL: z.enum(['debug', 'log', 'warn', 'error']).default('log'),

  /**
   * A string de conexão do Postgres (Neon), no formato
   * `postgresql://usuario:senha@host/banco?sslmode=require`.
   *
   * É segredo: mora no `.env`, que não é versionado. O painel da Neon mostra essa string
   * pronta em "Connection string".
   */
  DATABASE_URL: z
    .string()
    .trim()
    .min(1, 'Informe a string de conexão do Postgres (DATABASE_URL)')
    .startsWith('postgres', 'A DATABASE_URL precisa começar com postgres:// ou postgresql://'),

  /**
   * O banco que os testes E2E usam. Eles APAGAM e recriam as tabelas, então nunca pode ser o
   * mesmo da DATABASE_URL — na Neon, o caminho é criar uma branch do banco só para teste.
   *
   * Sem ele os testes E2E não rodam; o resto do sistema sobe normalmente.
   */
  TEST_DATABASE_URL: z.string().trim().optional(),

  /**
   * Credenciais do Cloudflare R2, que fala o protocolo do S3.
   *
   * O endpoint é derivado do `R2_ACCOUNT_ID` (ver storage.service.ts) em vez de ser mais uma
   * variável: é sempre `https://<conta>.r2.cloudflarestorage.com`, e deixar isso configurável
   * só criaria uma forma a mais de errar.
   */
  R2_ACCOUNT_ID: z.string().trim().min(1, 'Informe o ID da conta do Cloudflare (R2_ACCOUNT_ID)'),
  R2_ACCESS_KEY_ID: z.string().trim().min(1, 'Informe a chave de acesso do R2'),
  R2_SECRET_ACCESS_KEY: z.string().trim().min(1, 'Informe o segredo do R2'),
  R2_BUCKET: z.string().trim().min(1, 'Informe o nome do bucket do R2'),

  /**
   * Por quantos segundos um link de download assinado continua valendo.
   *
   * Curto de propósito: o link dá acesso ao arquivo a quem o tiver, sem passar pela
   * identidade. Ele existe para o navegador baixar AGORA, não para ser guardado.
   */
  R2_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),

  /**
   * O endereço do Neon Auth — quem faz o login das pessoas.
   *
   * É a MESMA URL do `VITE_NEON_AUTH_URL` do client, sem o prefixo `VITE_`: a tela manda
   * e-mail e senha para lá, e o servidor usa o mesmo endereço para buscar a chave pública
   * (`/.well-known/jwks.json`) e conferir a assinatura do token que a tela apresenta.
   *
   * Sem padrão de propósito: cada projeto da Neon tem o seu, e um endereço errado aqui não
   * falharia na partida — falharia no primeiro login, parecendo senha errada.
   */
  /**
   * O segredo do webhook do UniFi.
   *
   * O controlador da rede não tem login: ele prova quem é apresentando este valor na URL do
   * webhook. Sem a variável, a rota do webhook RECUSA tudo — é melhor a integração ficar
   * fora do ar do que aberta para qualquer um gravar evento de rede.
   *
   * Opcional porque o resto do sistema sobe sem ela: quem não usa UniFi registra as quedas
   * à mão, pela própria tela.
   */
  UNIFI_WEBHOOK_TOKEN: z.string().trim().min(16, 'O segredo do webhook precisa ser longo').optional(),

  NEON_AUTH_URL: z
    .string()
    .trim()
    .min(1, 'Informe a URL do Neon Auth (NEON_AUTH_URL)')
    .url('NEON_AUTH_URL precisa ser uma URL completa'),
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
