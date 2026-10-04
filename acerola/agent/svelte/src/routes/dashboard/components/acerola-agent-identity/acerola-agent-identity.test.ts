import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaAgentIdentity from './acerola-agent-identity.svelte';

describe('AcerolaAgentIdentity', () => {
	// feliz
	it('shows the agent name, the live badge and the station line', () => {
		render(AcerolaAgentIdentity, {
			props: { data: { isLive: true, subtitle: 'ESTACAO-EXEMPLO-01 · Windows 11 · online há 1d' } }
		});

		expect(screen.getByRole('heading', { name: 'Acerola Agent' })).toBeInTheDocument();
		expect(screen.getByText('Ao vivo')).toBeInTheDocument();
		expect(screen.getByText('ESTACAO-EXEMPLO-01 · Windows 11 · online há 1d')).toBeInTheDocument();
		expect(screen.getByAltText('Acerola')).toBeInTheDocument();
	});

	// triste
	it('says it is still connecting and hides the station line before the first reading', () => {
		const { container } = render(AcerolaAgentIdentity, { props: { data: { isLive: false } } });

		expect(screen.getByText('Conectando')).toBeInTheDocument();
		expect(screen.queryByText('Ao vivo')).not.toBeInTheDocument();
		expect(container.querySelector('p')).toBeNull();
	});
});
