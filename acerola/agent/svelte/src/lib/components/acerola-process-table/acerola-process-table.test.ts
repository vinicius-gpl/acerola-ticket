import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaProcessTable from './acerola-process-table.svelte';
import type { ProcessStats } from '$lib/metrics/types';

// O caso que motivou o agrupamento: o Chrome soma 2,6 GB em três processos,
// mas o maior deles sozinho tem só 1,2 GB.
const chrome: ProcessStats = {
	name: 'chrome.exe',
	instanceCount: 3,
	cpuPercent: 12,
	memPercent: 16,
	memBytes: 2_600_000_000,
	instances: [
		{ pid: 8120, cpuPercent: 8, memPercent: 7, memBytes: 1_200_000_000 },
		{ pid: 8122, cpuPercent: 3, memPercent: 6, memBytes: 1_000_000_000 },
		{ pid: 8130, cpuPercent: 1, memPercent: 3, memBytes: 400_000_000 }
	]
};

const explorer: ProcessStats = {
	name: 'explorer.exe',
	instanceCount: 1,
	cpuPercent: 20,
	memPercent: 2,
	memBytes: 180_000_000,
	instances: [{ pid: 4410, cpuPercent: 20, memPercent: 2, memBytes: 180_000_000 }]
};

describe('AcerolaProcessTable', () => {
	// feliz
	it('shows one row per application with the summed memory and the instance count', () => {
		const { getByText, queryByText } = render(AcerolaProcessTable, {
			props: { data: { processes: [chrome, explorer] } }
		});

		expect(getByText('chrome.exe')).toBeInTheDocument();
		expect(getByText('(3)')).toBeInTheDocument();
		expect(getByText('2.4 GB')).toBeInTheDocument();

		// Enquanto o grupo está fechado, os processos individuais não aparecem
		expect(queryByText('PID 8120')).not.toBeInTheDocument();
	});

	// feliz
	it('expands a group on click and lists every process inside it', async () => {
		const { getByText, queryByText } = render(AcerolaProcessTable, {
			props: { data: { processes: [chrome] } }
		});

		await fireEvent.click(getByText('chrome.exe'));

		expect(getByText('PID 8120')).toBeInTheDocument();
		expect(getByText('PID 8122')).toBeInTheDocument();
		expect(getByText('PID 8130')).toBeInTheDocument();

		await fireEvent.click(getByText('chrome.exe'));
		expect(queryByText('PID 8120')).not.toBeInTheDocument();
	});

	// feliz
	it('sorts by memory when the memory header is clicked', async () => {
		const { getByText, container } = render(AcerolaProcessTable, {
			props: { data: { processes: [chrome, explorer] } }
		});

		// Ordem inicial é por CPU: explorer (20%) na frente do chrome (12%)
		expect(container.querySelectorAll('tbody tr')[0]).toHaveTextContent('explorer.exe');

		await fireEvent.click(getByText(/Memória/));

		// Por memória o chrome (2,6 GB) passa o explorer (180 MB)
		expect(container.querySelectorAll('tbody tr')[0]).toHaveTextContent('chrome.exe');
	});

	// feliz
	it('flips the direction when the same header is clicked twice', async () => {
		const { getByText, container } = render(AcerolaProcessTable, {
			props: { data: { processes: [chrome, explorer] } }
		});

		await fireEvent.click(getByText(/CPU %/));

		expect(container.querySelectorAll('tbody tr')[0]).toHaveTextContent('chrome.exe');
	});

	// triste
	it('shows a message instead of an empty table when there is no process (edge case)', () => {
		const { getByText, container } = render(AcerolaProcessTable, {
			props: { data: { processes: [] } }
		});

		expect(getByText('Nenhum processo para mostrar.')).toBeInTheDocument();
		expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
	});

	// triste
	it('still renders an application that has a single process (edge case)', async () => {
		const { getByText } = render(AcerolaProcessTable, {
			props: { data: { processes: [explorer] } }
		});

		expect(getByText('(1)')).toBeInTheDocument();

		await fireEvent.click(getByText('explorer.exe'));
		expect(getByText('PID 4410')).toBeInTheDocument();
	});
});
