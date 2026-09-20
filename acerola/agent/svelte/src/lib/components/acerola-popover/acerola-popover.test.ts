import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaPopoverHarness from './acerola-popover-harness.test.svelte';

describe('AcerolaPopover', () => {
	it('renderiza o elemento trigger corretamente', () => {
		render(AcerolaPopoverHarness, { props: { title: 'Detalhes' } });
		expect(screen.getByRole('button', { name: 'Abrir painel' })).toBeInTheDocument();
	});
});
