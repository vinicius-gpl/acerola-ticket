import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaSparkline from './acerola-sparkline.svelte';

describe('AcerolaSparkline', () => {
	// feliz
	it('mounts uPlot canvas without crashing when provided with valid series data', () => {
		// Inicializa a instância do uPlot acoplada ao elemento container do componente
		const { container } = render(AcerolaSparkline, {
			props: {
				data: { timestamps: [0, 1, 2], series: [[10, 20, 15]] },
				ui: { colorVars: ['--chart-5'], fixedMax: 100 }
			}
		});
		expect(container.firstElementChild).toBeTruthy();
		expect(container.querySelector('.u-wrap')).toBeInTheDocument();
	});

	// feliz
	it('supports multiple series and custom color variables', () => {
		// Suporta renderização simultânea de download/upload ou leitura/escrita
		const { container } = render(AcerolaSparkline, {
			props: {
				data: {
					timestamps: [0, 1, 2],
					series: [
						[10, 20, 15],
						[5, 12, 8]
					]
				},
				ui: { colorVars: ['--chart-5', '--chart-2'], height: 60 }
			}
		});
		expect(container.querySelector('.u-wrap')).toBeInTheDocument();
	});

	// triste
	it('mounts safely without throwing when series data is empty (edge case)', () => {
		// Na inicialização do agente antes de coletar a primeira amostra, os dados chegam vazios
		const { container } = render(AcerolaSparkline, {
			props: {
				data: { timestamps: [], series: [[]] },
				ui: { colorVars: ['--chart-5'] }
			}
		});
		expect(container.firstElementChild).toBeTruthy();
	});

	// triste
	it('handles undefined ui options gracefully using default values (edge case)', () => {
		// Sem ui definido, utiliza altura padrão e auto-scaling
		const { container } = render(AcerolaSparkline, {
			props: {
				data: { timestamps: [0, 1], series: [[5, 10]] },
				ui: undefined
			}
		});
		expect(container.firstElementChild).toBeTruthy();
	});
});
