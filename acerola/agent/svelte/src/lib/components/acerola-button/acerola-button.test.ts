import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import AcerolaButtonHarness from './acerola-button-harness.test.svelte';

describe('AcerolaButton', () => {
	// feliz
	it('calls onClick callback when clicked', async () => {
		// O callback onClick é a ação principal disparada ao interagir com o botão ativo
		const onClick = vi.fn();
		const { getByRole } = render(AcerolaButtonHarness, { props: { events: { onClick } } });
		await getByRole('button').click();
		expect(onClick).toHaveBeenCalledOnce();
	});

	// feliz
	it('renders label text provided via children snippet', () => {
		// O conteúdo de texto injetado no snippet filho deve ser exibido corretamente
		render(AcerolaButtonHarness, { props: {} });
		expect(screen.getByText('Abrir Dashboard')).toBeInTheDocument();
	});

	// feliz
	it('applies title and custom variant attributes', () => {
		// Garante que atributos de acessibilidade e estilo passados em ui são repassados ao elemento nativo
		const { getByRole } = render(AcerolaButtonHarness, {
			props: { ui: { title: 'Fechar Janela', variant: 'ghost', size: 'icon' } }
		});
		const button = getByRole('button');
		expect(button).toHaveAttribute('title', 'Fechar Janela');
	});

	// triste
	it('does not call onClick when disabled', async () => {
		// Botão desabilitado nunca pode disparar o callback de clique
		const onClick = vi.fn();
		const { getByRole } = render(AcerolaButtonHarness, {
			props: { events: { onClick }, ui: { disabled: true } }
		});
		await getByRole('button').click();
		expect(onClick).not.toHaveBeenCalled();
	});

	// triste
	it('handles clicks gracefully when events object or onClick is absent (edge case)', () => {
		// Caso o consumidor não defina o evento onClick, clicar no botão não deve lançar exceção
		const { getByRole } = render(AcerolaButtonHarness, { props: { events: undefined } });
		expect(() => getByRole('button').click()).not.toThrow();
	});
});
