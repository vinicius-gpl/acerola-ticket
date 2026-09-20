import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaCardHarness from './acerola-card-harness.test.svelte';

describe('AcerolaCard', () => {
	// feliz
	it('renders title and children content', () => {
		// O card deve renderizar o título no cabeçalho e o conteúdo injetado no corpo
		render(AcerolaCardHarness, { props: { data: { title: 'CPU' } } });
		expect(screen.getByText('CPU')).toBeInTheDocument();
		expect(screen.getByText('42%')).toBeInTheDocument();
	});

	// feliz
	it('applies small size attribute when configured in ui prop', () => {
		// A variante de tamanho sm reduz o padding interno (--card-spacing)
		const { container } = render(AcerolaCardHarness, {
			props: { data: { title: 'Memória' }, ui: { size: 'sm' } }
		});
		const card = container.querySelector('[data-slot="card"]');
		expect(card).toHaveAttribute('data-size', 'sm');
	});

	// feliz
	it('applies custom class through ui prop', () => {
		// O consumidor pode estender as classes utilitárias do card
		const { container } = render(AcerolaCardHarness, {
			props: { ui: { class: 'custom-card-class' } }
		});
		const card = container.querySelector('[data-slot="card"]');
		expect(card?.className).toContain('custom-card-class');
	});

	// triste
	it('renders content only without header when title is omitted (edge case)', () => {
		// Quando data.title não é informado, não renderiza cabeçalho desnecessário
		render(AcerolaCardHarness, { props: {} });
		expect(screen.queryByText('CPU')).not.toBeInTheDocument();
		expect(screen.getByText('42%')).toBeInTheDocument();
	});

	// triste
	it('renders without throwing when data and ui are undefined (edge case)', () => {
		// Montagem segura mesmo sem nenhum dado ou configuração inicial
		const { container } = render(AcerolaCardHarness, {
			props: { data: undefined, ui: undefined }
		});
		expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument();
	});
});
