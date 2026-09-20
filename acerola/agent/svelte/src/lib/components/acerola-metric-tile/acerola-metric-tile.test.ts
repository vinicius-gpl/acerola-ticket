import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaMetricTile from './acerola-metric-tile.svelte';

describe('AcerolaMetricTile', () => {
	it('mostra rótulo e valor', () => {
		// feliz
		render(AcerolaMetricTile, { props: { data: { label: 'CPU', value: '42%' } } });
		expect(screen.getByText('CPU')).toBeInTheDocument();
		expect(screen.getByText('42%')).toBeInTheDocument();
	});

	it('mostra o selo de tendência quando informado', () => {
		// feliz
		render(AcerolaMetricTile, {
			props: {
				data: {
					label: 'CPU',
					value: '42%',
					trend: { direction: 'up', delta: 5 },
					trendFormat: (delta: number) => `${delta.toFixed(0)}pp`
				}
			}
		});
		expect(screen.getByText('5pp')).toBeInTheDocument();
	});

	it('não mostra sparkline nem tendência quando não informados (caso limite)', () => {
		// triste
		const { container } = render(AcerolaMetricTile, {
			props: { data: { label: 'Rede', value: '—' } }
		});
		expect(container.querySelector('canvas')).not.toBeInTheDocument();
	});
});
