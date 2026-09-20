import { render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import AcerolaThemeToggle from './acerola-theme-toggle.svelte';

beforeEach(() => {
	document.documentElement.removeAttribute('data-theme');
});

describe('AcerolaThemeToggle', () => {
	// feliz
	it('toggles document theme attribute when clicked', async () => {
		// Ao clicar no botão, o tema raiz do html deve ser alternado (ex: mocha <-> latte)
		const { getByRole } = render(AcerolaThemeToggle, { props: {} });
		const button = getByRole('button');

		const before = document.documentElement.getAttribute('data-theme');
		await button.click();
		const after = document.documentElement.getAttribute('data-theme');

		expect(after).not.toBe(before);
	});

	// feliz
	it('renders with proper accessible title attribute', () => {
		// Garante acessibilidade com title informativo no botão de alternância
		const { getByRole } = render(AcerolaThemeToggle, { props: {} });
		const button = getByRole('button');
		expect(button).toHaveAttribute('title', 'Alternar tema');
	});

	// triste
	it('handles repeated rapid toggles without breaking state (edge case)', async () => {
		// Múltiplos cliques rápidos consecutivos devem alternar o tema deterministicamente sem travar o store
		const { getByRole } = render(AcerolaThemeToggle, { props: {} });
		const button = getByRole('button');

		const start = document.documentElement.getAttribute('data-theme');
		await button.click();
		await button.click();
		await button.click();

		expect(document.documentElement.getAttribute('data-theme')).not.toBe(start);
	});

	// triste
	it('initializes safely even when document data-theme was absent (edge case)', () => {
		// Sem atributo prévio na tag <html>, deve montar e inicializar com tema padrão
		const { getByRole } = render(AcerolaThemeToggle, { props: {} });
		expect(getByRole('button')).toBeInTheDocument();
	});
});
