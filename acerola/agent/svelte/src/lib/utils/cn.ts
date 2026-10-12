import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/* O MERGE PRECISA CONHECER A RÉGUA DA CASA (`theme/tailwind.css`).

   De fábrica o `tailwind-merge` só conhece a escala do Tailwind: sem este ensino ele não vê que
   `rounded-control` e `rounded-md` são o mesmo canto, nem que `control-lg` e `h-9` são a mesma
   altura, e deixa os dois pares na marcação. Com os dois presentes vence o do componente
   baixado (`ui/`), e um controle com as classes certas sai com o canto e a altura errados.

   - `theme.radius`: os quatro papéis de canto entram na mesma família de `rounded-md`.
   - `control-*`: define altura e respiro lateral, então derruba `h-*` e `px-*` que vieram ANTES.
     A largura fica de fora: `w-full` antes de `control-lg` continua valendo.
   - `control-icon-*`: define altura e largura, então derruba também `w-*` e `size-*`. */
const HORIZONTAL_PADDING = ['px', 'ps', 'pe', 'pl', 'pr'] as const;

const twMerge = extendTailwindMerge<'control' | 'control-icon'>({
	extend: {
		theme: { radius: ['surface', 'control', 'box', 'chip'] },
		classGroups: {
			control: [{ control: ['sm', 'md', 'lg'] }],
			'control-icon': [{ 'control-icon': ['sm', 'md', 'lg'] }]
		},
		conflictingClassGroups: {
			control: ['h', ...HORIZONTAL_PADDING, 'control-icon'],
			'control-icon': ['h', 'w', 'size', ...HORIZONTAL_PADDING, 'control']
		}
	}
});

// Portado de acerola-reader/acerola/desktop/svelte/src/lib/utils/cn.utils.ts
// — mesma função e mesmos tipos auxiliares, exigidos pelos componentes que
// o shadcn-svelte gera em ui/.
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
