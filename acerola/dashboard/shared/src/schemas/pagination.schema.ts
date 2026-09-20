import { z } from 'zod';

/**
 * Paginação de toda listagem. O teto existe porque consulta sem limite em coleção
 * grande trava a tela e o banco juntos — e isso chega na equipe como "o sistema está
 * lento", sem ninguém saber por quê.
 */
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const sortDirectionSchema = z.enum(['asc', 'desc']);

export type SortDirection = z.infer<typeof sortDirectionSchema>;

export function paginatedSchema<TItem extends z.ZodTypeAny>(item: TItem) {
  return z.object({
    items: z.array(item),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
  });
}

export type Paginated<TItem> = {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
};

export function paginationRange(query: PaginationQuery): { from: number; to: number } {
  const from = (query.page - 1) * query.pageSize;

  return { from, to: from + query.pageSize - 1 };
}
