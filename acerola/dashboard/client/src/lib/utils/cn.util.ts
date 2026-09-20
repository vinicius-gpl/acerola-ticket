import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Junta classes e resolve conflito do Tailwind pelo ÚLTIMO valor.
 *
 * Sem o merge, `cn('px-2', className)` com `className="px-6"` deixa as duas classes na
 * marcação e quem vence é a ordem do CSS gerado — que muda entre build de desenvolvimento e
 * de produção. É como um espaçamento fica certo na máquina de quem escreveu e errado no ar.
 */
export function cn(...values: ClassValue[]): string {
  return twMerge(clsx(values));
}
