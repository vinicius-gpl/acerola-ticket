import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaBadgeHarness from './acerola-badge-harness.test.svelte';

describe('AcerolaBadge', () => {
	it('renderiza o texto no tom padrão', () => {
		// feliz
		render(AcerolaBadgeHarness, { props: { text: 'conectando' } });
		expect(screen.getByText('conectando')).toBeInTheDocument();
	});

	it('renderiza vazio sem quebrar (caso limite)', () => {
		// triste
		const { container } = render(AcerolaBadgeHarness, { props: { text: '' } });
		expect(container.querySelector('[data-slot="badge"]')).toBeInTheDocument();
	});
});
