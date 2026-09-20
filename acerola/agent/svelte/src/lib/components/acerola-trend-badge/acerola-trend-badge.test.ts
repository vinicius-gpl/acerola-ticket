import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaTrendBadge from './acerola-trend-badge.svelte';

const format = (delta: number) => `${delta.toFixed(0)}pp`;

describe('AcerolaTrendBadge', () => {
	it('mostra o delta formatado quando subindo', () => {
		// feliz
		render(AcerolaTrendBadge, {
			props: { data: { trend: { direction: 'up', delta: 4.2 }, format } }
		});
		expect(screen.getByText('4pp')).toBeInTheDocument();
	});

	it('mostra o valor absoluto do delta quando descendo', () => {
		// feliz
		render(AcerolaTrendBadge, {
			props: { data: { trend: { direction: 'down', delta: -3.7 }, format } }
		});
		expect(screen.getByText('4pp')).toBeInTheDocument();
	});

	it('mostra zero sem quebrar quando estável (caso limite)', () => {
		// triste
		render(AcerolaTrendBadge, {
			props: { data: { trend: { direction: 'flat', delta: 0 }, format } }
		});
		expect(screen.getByText('0pp')).toBeInTheDocument();
	});
});
