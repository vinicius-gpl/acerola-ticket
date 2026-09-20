import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import AcerolaButtonHarness from './acerola-button-harness.test.svelte';

describe('AcerolaButton', () => {
	it('chama onClick quando clicado', async () => {
		// feliz
		const onClick = vi.fn();
		const { getByRole } = render(AcerolaButtonHarness, { props: { events: { onClick } } });
		await getByRole('button').click();
		expect(onClick).toHaveBeenCalledOnce();
	});

	it('não chama onClick quando desabilitado', async () => {
		// triste
		const onClick = vi.fn();
		const { getByRole } = render(AcerolaButtonHarness, {
			props: { events: { onClick }, ui: { disabled: true } }
		});
		await getByRole('button').click();
		expect(onClick).not.toHaveBeenCalled();
	});

	it('renderiza o texto passado', () => {
		render(AcerolaButtonHarness, { props: {} });
		expect(screen.getByText('Abrir Dashboard')).toBeInTheDocument();
	});
});
