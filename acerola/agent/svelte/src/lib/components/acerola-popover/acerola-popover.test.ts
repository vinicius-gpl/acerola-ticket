import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaPopoverHarness from './acerola-popover-harness.test.svelte';

describe('AcerolaPopover', () => {
	// feliz
	it('renders trigger element properly', () => {
		// O trigger do popover deve renderizar no documento com o texto e acessibilidade esperados
		render(AcerolaPopoverHarness, { props: { triggerText: 'Abrir painel' } });
		expect(screen.getByRole('button', { name: 'Abrir painel' })).toBeInTheDocument();
	});

	// feliz
	it('applies custom triggerClass through ui prop', () => {
		// As classes de gatilho devem ser aplicadas ao container do trigger
		const { container } = render(AcerolaPopoverHarness, {
			props: { ui: { triggerClass: 'custom-trigger-class' } }
		});
		const trigger = container.querySelector('.custom-trigger-class');
		expect(trigger).toBeInTheDocument();
	});

	// triste
	it('renders trigger gracefully when data title and description are omitted (edge case)', () => {
		// Se nenhum título for informado, o componente deve renderizar o trigger sem lançar exceção
		render(AcerolaPopoverHarness, {
			props: { title: undefined, description: undefined, triggerText: 'Gatilho sem título' }
		});
		expect(screen.getByRole('button', { name: 'Gatilho sem título' })).toBeInTheDocument();
	});

	// triste
	it('renders trigger without error when content snippet is empty (edge case)', () => {
		// Se o snippet de conteúdo não for fornecido, a montagem do popover não falha
		render(AcerolaPopoverHarness, { props: { hasContent: false, triggerText: 'Sem conteúdo' } });
		expect(screen.getByRole('button', { name: 'Sem conteúdo' })).toBeInTheDocument();
	});
});
