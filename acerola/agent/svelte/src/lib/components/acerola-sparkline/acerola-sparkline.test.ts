import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaSparkline from './acerola-sparkline.svelte';

describe('AcerolaSparkline', () => {
	it('monta sem quebrar com dados', () => {
		// feliz
		const { container } = render(AcerolaSparkline, {
			props: {
				data: { timestamps: [0, 1, 2], series: [[10, 20, 15]] },
				ui: { colorVars: ['--chart-5'] }
			}
		});
		expect(container.firstElementChild).toBeTruthy();
	});

	it('monta sem quebrar sem nenhum dado ainda (caso limite)', () => {
		// triste
		const { container } = render(AcerolaSparkline, {
			props: {
				data: { timestamps: [], series: [[]] },
				ui: { colorVars: ['--chart-5'] }
			}
		});
		expect(container.firstElementChild).toBeTruthy();
	});
});
