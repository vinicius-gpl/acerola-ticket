import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaTooltipHarness from './acerola-tooltip-harness.test.svelte';

describe('AcerolaTooltip', () => {
	// feliz
	it('renders trigger element properly with default configuration', () => {
		// O componente encapsula o trigger interativo que exibe a dica no hover/foco
		render(AcerolaTooltipHarness, { props: { triggerText: 'Passe o mouse' } });
		expect(screen.getByRole('button', { name: 'Passe o mouse' })).toBeInTheDocument();
	});

	// feliz
	it('applies custom triggerClass through ui prop', () => {
		// Permite customizar a classe utilitária aplicada ao invólucro do gatilho
		const { container } = render(AcerolaTooltipHarness, {
			props: { ui: { triggerClass: 'custom-tooltip-trigger' } }
		});
		const trigger = container.querySelector('.custom-tooltip-trigger');
		expect(trigger).toBeInTheDocument();
	});

	// feliz
	it('renders with custom content snippet support', () => {
		// O tooltip pode receber snippets customizados além de simples strings
		render(AcerolaTooltipHarness, {
			props: { hasContent: true, triggerText: 'Gatilho custom' }
		});
		expect(screen.getByRole('button', { name: 'Gatilho custom' })).toBeInTheDocument();
	});

	// triste
	it('handles empty text data gracefully without throwing (edge case)', () => {
		// Se data.text for vazio, o trigger ainda monta e funciona com segurança
		render(AcerolaTooltipHarness, { props: { text: '', triggerText: 'Sem dica' } });
		expect(screen.getByRole('button', { name: 'Sem dica' })).toBeInTheDocument();
	});

	// triste
	it('handles undefined data object gracefully (edge case)', () => {
		// Se o objeto data não for passado, renderiza o trigger sem falhas
		render(AcerolaTooltipHarness, {
			props: { text: undefined, triggerText: 'Gatilho puro' }
		});
		expect(screen.getByRole('button', { name: 'Gatilho puro' })).toBeInTheDocument();
	});
});
