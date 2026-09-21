import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaSegmentedBar from './acerola-segmented-bar.svelte';

describe('AcerolaSegmentedBar', () => {
	// feliz
	it('renders a progressbar with the given percent rounded to the nearest integer', () => {
		const { getByRole } = render(AcerolaSegmentedBar, { props: { data: { percent: 92.6 } } });
		const bar = getByRole('progressbar');
		expect(bar).toHaveAttribute('aria-valuenow', '93');
		expect(bar).toHaveAttribute('aria-valuemin', '0');
		expect(bar).toHaveAttribute('aria-valuemax', '100');
	});

	// feliz
	it('fills the exact number of segments proportional to the percent', () => {
		const { container } = render(AcerolaSegmentedBar, {
			props: { data: { percent: 50 }, ui: { segments: 10, colorVar: '--chart-4' } }
		});
		const segments = container.querySelectorAll('[role="progressbar"] > div');
		expect(segments).toHaveLength(10);
		const filled = Array.from(segments).filter((segment) =>
			(segment as HTMLElement).style.background.includes('--chart-4')
		);
		expect(filled).toHaveLength(5);
	});

	// triste
	it('clamps percent above 100 so the bar never overflows (edge case)', () => {
		const { getByRole, container } = render(AcerolaSegmentedBar, {
			props: { data: { percent: 250 }, ui: { segments: 8 } }
		});
		expect(getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
		const segments = container.querySelectorAll('[role="progressbar"] > div');
		expect(segments).toHaveLength(8);
	});

	// triste
	it('clamps negative percent to zero filled segments (edge case)', () => {
		const { getByRole, container } = render(AcerolaSegmentedBar, {
			props: { data: { percent: -10 }, ui: { segments: 6, colorVar: '--chart-4' } }
		});
		expect(getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
		const segments = container.querySelectorAll('[role="progressbar"] > div');
		const filled = Array.from(segments).filter((segment) =>
			(segment as HTMLElement).style.background.includes('--chart-4')
		);
		expect(filled).toHaveLength(0);
	});
});
