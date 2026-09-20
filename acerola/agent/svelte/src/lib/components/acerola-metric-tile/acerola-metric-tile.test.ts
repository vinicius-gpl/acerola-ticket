import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaMetricTile from './acerola-metric-tile.svelte';

describe('AcerolaMetricTile', () => {
	// feliz
	it('renders metric label and value correctly', () => {
		// O bloco de métrica sempre exibe o rótulo descritivo e o valor principal
		render(AcerolaMetricTile, { props: { data: { label: 'CPU', value: '42%' } } });
		expect(screen.getByText('CPU')).toBeInTheDocument();
		expect(screen.getByText('42%')).toBeInTheDocument();
	});

	// feliz
	it('displays trend badge when trend and format callback are provided', () => {
		// Quando há dados históricos comparáveis, renderiza o badge de tendência com delta formatado
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

	// feliz
	it('renders sparkline chart container when sparkline series data is present', () => {
		// Renderiza a sparkline embutida para gráficos temporais compactos
		const { container } = render(AcerolaMetricTile, {
			props: {
				data: {
					label: 'Memória',
					value: '80%',
					sparkline: { timestamps: [0, 1, 2], series: [[10, 20, 30]] }
				},
				ui: { colorVars: ['--chart-4'], fixedMax: 100 }
			}
		});
		expect(container.querySelector('.u-wrap')).toBeInTheDocument();
	});

	// feliz
	it('applies custom class through ui prop', () => {
		// Permite customização de classes no card raiz do metric tile
		const { container } = render(AcerolaMetricTile, {
			props: {
				data: { label: 'Rede', value: '10 KB/s' },
				ui: { class: 'custom-tile-class' }
			}
		});
		const card = container.querySelector('[data-slot="card"]');
		expect(card?.className).toContain('custom-tile-class');
	});

	// triste
	it('does not render sparkline canvas when sparkline prop is missing (edge case)', () => {
		// Sem série histórica, não deve alocar o container de canvas do uPlot
		const { container } = render(AcerolaMetricTile, {
			props: { data: { label: 'Rede', value: '—' } }
		});
		expect(container.querySelector('canvas')).not.toBeInTheDocument();
	});

	// triste
	it('does not render trend badge when trend data is omitted', () => {
		// Sem tendência anterior calculada, o badge indicador não deve ser renderizado
		render(AcerolaMetricTile, {
			props: { data: { label: 'Disco I/O', value: '0 B/s' } }
		});
		expect(screen.queryByText(/pp/)).not.toBeInTheDocument();
	});
});
