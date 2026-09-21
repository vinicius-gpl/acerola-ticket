import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaTrendBadge from './acerola-trend-badge.svelte';

const format = (delta: number) => `${delta.toFixed(0)}pp`;

describe('AcerolaTrendBadge', () => {
	// feliz
	it('renders upward arrow and formatted delta when trend is moving up', () => {
		// Tendência de subida deve exibir ícone de seta para cima e delta formatado
		const { container } = render(AcerolaTrendBadge, {
			props: { data: { trend: { direction: 'up', delta: 4.2 }, format } }
		});
		expect(container.querySelector('.lucide-arrow-up')).toBeInTheDocument();
		expect(screen.getByText('4pp')).toBeInTheDocument();
	});

	// feliz
	it('renders downward arrow and formatted delta when trend is moving down', () => {
		// Tendência de queda deve exibir ícone de seta para baixo e delta formatado
		const { container } = render(AcerolaTrendBadge, {
			props: { data: { trend: { direction: 'down', delta: 3.7 }, format } }
		});
		expect(container.querySelector('.lucide-arrow-down')).toBeInTheDocument();
		expect(screen.getByText('4pp')).toBeInTheDocument();
	});

	// feliz
	it('applies custom class through ui prop', () => {
		// Classes adicionais passadas pelo consumidor devem ser mescladas ao span raiz
		const { container } = render(AcerolaTrendBadge, {
			props: {
				data: { trend: { direction: 'up', delta: 2 }, format },
				ui: { class: 'custom-trend-class' }
			}
		});
		const badge = container.querySelector('span');
		expect(badge?.className).toContain('custom-trend-class');
	});

	// triste
	it('renders flat arrow and zero without throwing when trend is neutral (edge case)', () => {
		// Tendência estável exibe ícone de menos/traço e delta zero
		const { container } = render(AcerolaTrendBadge, {
			props: { data: { trend: { direction: 'flat', delta: 0 }, format } }
		});
		expect(container.querySelector('.lucide-minus')).toBeInTheDocument();
		expect(screen.getByText('0pp')).toBeInTheDocument();
	});

	// triste
	it('handles negative delta gracefully using absolute value in display (edge case)', () => {
		// Caso o delta chegue negativo, a formatação sempre extrai o valor absoluto para exibição limpa
		render(AcerolaTrendBadge, {
			props: { data: { trend: { direction: 'down', delta: -8.4 }, format } }
		});
		expect(screen.getByText('8pp')).toBeInTheDocument();
	});
});
