import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaCardHarness from './acerola-card-harness.test.svelte';

describe('AcerolaCard', () => {
	it('renderiza título e conteúdo', () => {
		// feliz
		render(AcerolaCardHarness, { props: { data: { title: 'CPU' } } });
		expect(screen.getByText('CPU')).toBeInTheDocument();
		expect(screen.getByText('42%')).toBeInTheDocument();
	});

	it('não quebra sem título', () => {
		// triste (caso limite): sem data.title, não deve tentar renderizar um
		// título vazio, só o conteúdo
		render(AcerolaCardHarness, { props: {} });
		expect(screen.queryByText('CPU')).not.toBeInTheDocument();
		expect(screen.getByText('42%')).toBeInTheDocument();
	});
});
