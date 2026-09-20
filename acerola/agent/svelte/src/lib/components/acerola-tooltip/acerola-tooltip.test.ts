import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaTooltipHarness from './acerola-tooltip-harness.test.svelte';

describe('AcerolaTooltip', () => {
	it('renderiza o elemento trigger corretamente', () => {
		render(AcerolaTooltipHarness, { props: { text: 'Ajuda de CPU' } });
		expect(screen.getByRole('button', { name: 'Passe o mouse' })).toBeInTheDocument();
	});
});
