import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * A RÉGUA DE MEDIDAS apresentada ao `tailwind-merge`.
 *
 * `control-sm/md/lg` e `control-icon-*` são utilitários nossos, declarados em
 * `lib/theme/tokens.css`. O `tailwind-merge` só conhece as classes do Tailwind, então sem
 * este registro ele não vê conflito nenhum entre `h-8` e `control-md` e deixa as duas na
 * marcação — e aí quem decide a altura é a ordem do CSS gerado, que é justamente o que o
 * `cn` existe para não depender.
 *
 * Isso acontece de verdade no `ActionButton`: o componente baixado traz a altura dele
 * (`h-8`) e a nossa vem depois, por cima.
 *
 * O caminho é só de ida — `control-*` apaga `h`, `w`, `px` e `size` que vieram antes, mas
 * um `h-12` escrito depois continua valendo. Quem escreve uma altura à mão está dizendo que quer
 * aquela altura, e não que quer voltar para a régua.
 */
/* O `<'control'>` registra o NOME do grupo novo: sem ele o `tailwind-merge` só aceita os
   grupos que já conhece, e o TypeScript recusa o objeto inteiro. */
const twMerge = extendTailwindMerge<'control'>({
  extend: {
    classGroups: {
      control: [{ control: ['sm', 'md', 'lg'] }, { 'control-icon': ['sm', 'md', 'lg'] }],
      /* Os raios por papel entram no grupo que já existe: `rounded-control` e `rounded-full`
         são o mesmo conflito, e sem isto os dois ficavam na marcação. */
      rounded: [{ rounded: ['surface', 'control', 'box', 'chip'] }],
    },
    conflictingClassGroups: {
      control: ['h', 'w', 'px', 'size'],
    },
  },
});

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

/**
 * Tipos auxiliares do shadcn-svelte — todo componente vendorizado em `components/ui/` os
 * importa deste mesmo arquivo (é o alias `utils` do `components.json`). Sem eles aqui, o
 * `svelte-check` recusa TODOS esses componentes de uma vez.
 */
export type WithElementRef<T, E extends HTMLElement = HTMLElement> = T & { ref?: E | null };

export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, 'child'> : T;
export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
