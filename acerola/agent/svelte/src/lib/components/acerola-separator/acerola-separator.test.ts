import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaSeparator from './acerola-separator.svelte';

describe('AcerolaSeparator', () => {
	it('renderiza o separador sem quebrar', () => {
		const { container } = render(AcerolaSeparator);
		expect(container.querySelector('[data-slot="separator"]')).toBeInTheDocument();
	});
});
