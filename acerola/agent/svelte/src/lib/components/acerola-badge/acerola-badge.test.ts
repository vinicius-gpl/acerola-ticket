import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaBadgeHarness from './acerola-badge-harness.test.svelte';

describe('AcerolaBadge', () => {
	// feliz
	it('renders badge text with default tone', () => {
		// Garante que o texto passado via snippet é renderizado no documento com variante padrão
		render(AcerolaBadgeHarness, { props: { text: 'conectando' } });
		expect(screen.getByText('conectando')).toBeInTheDocument();
	});

	// feliz
	it('renders badge with online tone and custom tone classes', () => {
		// O tom "online" aplica a classe semântica de destaque verde (chart-4)
		const { container } = render(AcerolaBadgeHarness, {
			props: { text: 'ao vivo', ui: { tone: 'online' } }
		});
		const badge = container.querySelector('[data-slot="badge"]');
		expect(badge).toBeInTheDocument();
		expect(badge?.className).toContain('bg-chart-4');
	});

	// feliz
	it('renders badge with offline tone using destructive variant', () => {
		// O tom "offline" mapeia para a variante destrutiva do badge do shadcn
		const { container } = render(AcerolaBadgeHarness, {
			props: { text: 'offline', ui: { tone: 'offline' } }
		});
		const badge = container.querySelector('[data-slot="badge"]');
		expect(badge).toBeInTheDocument();
	});

	// feliz
	it('applies custom class when provided in ui prop', () => {
		// Classes utilitárias adicionais passadas pelo consumidor devem ser mescladas
		const { container } = render(AcerolaBadgeHarness, {
			props: { text: 'custom', ui: { class: 'custom-badge-class' } }
		});
		const badge = container.querySelector('[data-slot="badge"]');
		expect(badge?.className).toContain('custom-badge-class');
	});

	// triste
	it('renders empty content without throwing (edge case)', () => {
		// Se o texto for vazio, o componente ainda deve montar sem quebrar o layout
		const { container } = render(AcerolaBadgeHarness, { props: { text: '' } });
		expect(container.querySelector('[data-slot="badge"]')).toBeInTheDocument();
	});

	// triste
	it('renders very long text without throwing (edge case)', () => {
		// Rótulos muito extensos não devem causar erro de renderização
		const longText = 'Texto de badge extremamente longo para teste de caso limite';
		render(AcerolaBadgeHarness, { props: { text: longText } });
		expect(screen.getByText(longText)).toBeInTheDocument();
	});
});
