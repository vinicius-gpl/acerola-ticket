import { render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import AcerolaThemeToggle from './acerola-theme-toggle.svelte';

beforeEach(() => {
	document.documentElement.removeAttribute('data-theme');
});

describe('AcerolaThemeToggle', () => {
	it('alterna o tema da página ao clicar', async () => {
		// feliz
		const { getByRole } = render(AcerolaThemeToggle, { props: {} });
		const button = getByRole('button');

		const before = document.documentElement.getAttribute('data-theme');
		await button.click();
		const after = document.documentElement.getAttribute('data-theme');

		expect(after).not.toBe(before);
	});

	it('não quebra em cliques repetidos (caso limite)', async () => {
		// triste
		const { getByRole } = render(AcerolaThemeToggle, { props: {} });
		const button = getByRole('button');

		const start = document.documentElement.getAttribute('data-theme');
		await button.click();
		await button.click();
		await button.click();

		expect(document.documentElement.getAttribute('data-theme')).not.toBe(start);
	});
});
