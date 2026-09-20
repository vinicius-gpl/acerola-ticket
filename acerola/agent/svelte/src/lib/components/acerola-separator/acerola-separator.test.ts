import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaSeparator from './acerola-separator.svelte';

describe('AcerolaSeparator', () => {
	// feliz
	it('renders horizontal separator with default attributes', () => {
		// Por padrão o separador deve ser montado na orientação horizontal
		const { container } = render(AcerolaSeparator);
		const el = container.querySelector('[data-slot="separator"]');
		expect(el).toBeInTheDocument();
		expect(el).toHaveAttribute('data-orientation', 'horizontal');
	});

	// feliz
	it('renders vertical separator when specified in ui prop', () => {
		// A orientação vertical deve refletir o atributo de acessibilidade e layout
		const { container } = render(AcerolaSeparator, {
			props: { ui: { orientation: 'vertical' } }
		});
		const el = container.querySelector('[data-slot="separator"]');
		expect(el).toHaveAttribute('data-orientation', 'vertical');
	});

	// feliz
	it('applies custom class through ui prop', () => {
		// Classes utilitárias adicionais devem ser repassadas para o elemento DOM
		const { container } = render(AcerolaSeparator, {
			props: { ui: { class: 'custom-separator-class' } }
		});
		const el = container.querySelector('[data-slot="separator"]');
		expect(el?.className).toContain('custom-separator-class');
	});

	// triste
	it('handles undefined ui prop gracefully (edge case)', () => {
		// Quando ui não é fornecido, deve utilizar os valores padrão com segurança
		const { container } = render(AcerolaSeparator, { props: { ui: undefined } });
		const el = container.querySelector('[data-slot="separator"]');
		expect(el).toBeInTheDocument();
		expect(el).toHaveAttribute('data-orientation', 'horizontal');
	});
});
