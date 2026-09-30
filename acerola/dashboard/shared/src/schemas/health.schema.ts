import { z } from 'zod';

/**
 * O contrato da rota de saúde — o que o Traefik (e quem administra) lê para saber se este
 * container está de pé DE VERDADE.
 *
 * `database` existe porque processo vivo não é o mesmo que sistema funcionando: uma partida
 * que falhou ao falar com o banco responderia 200 em `/api/health` e passaria por saudável,
 * e o reinício automático nunca chegaria — o container ficaria no ar, inútil, em silêncio.
 */
export const healthStatusSchema = z.object({
  /** `ok` só quando todas as dependências abaixo respondem. */
  status: z.enum(['ok', 'down']),
  database: z.enum(['up', 'down']),
  /** Há quantos segundos o processo subiu. Reinício em laço aparece aqui como número baixo. */
  uptimeSeconds: z.number().int().nonnegative(),
  checkedAt: z.string(),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;
