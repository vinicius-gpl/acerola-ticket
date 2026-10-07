import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AcerolaProcessDrawer from './acerola-process-drawer.svelte';
import type { ProcessStats } from '$lib/types/metrics.type';

const chrome: ProcessStats = {
	name: 'chrome.exe',
	instanceCount: 3,
	cpuPercent: 12.5,
	memPercent: 16.0,
	memBytes: 2_600_000_000,
	instances: [
		{ pid: 8120, cpuPercent: 8, memPercent: 7, memBytes: 1_200_000_000 },
		{ pid: 8122, cpuPercent: 3, memPercent: 6, memBytes: 1_000_000_000 },
		{ pid: 8130, cpuPercent: 1.5, memPercent: 3, memBytes: 400_000_000 }
	]
};

const explorer: ProcessStats = {
	name: 'explorer.exe',
	instanceCount: 1,
	cpuPercent: 4.0,
	memPercent: 2.0,
	memBytes: 180_000_000,
	instances: [{ pid: 4410, cpuPercent: 4.0, memPercent: 2.0, memBytes: 180_000_000 }]
};

describe('AcerolaProcessDrawer', () => {
	it('renders list of processes and selects the first process by default', () => {
		const { getByText, getAllByText } = render(AcerolaProcessDrawer, {
			props: { data: { processes: [chrome, explorer] } }
		});

		expect(getByText('Fila de Processos')).toBeInTheDocument();
		expect(getAllByText('chrome.exe').length).toBeGreaterThanOrEqual(1);
		expect(getByText('Consumo Agregado de CPU')).toBeInTheDocument();
		expect(getByText('12.5%')).toBeInTheDocument();
	});

	it('switches the detail drawer when another process is clicked', async () => {
		const { getByText, getAllByText } = render(AcerolaProcessDrawer, {
			props: { data: { processes: [chrome, explorer] } }
		});

		const explorerButton = getAllByText('explorer.exe')[0];
		await fireEvent.click(explorerButton);

		expect(getAllByText('4.0%').length).toBeGreaterThanOrEqual(1);
		expect(getByText('PID 4410')).toBeInTheDocument();
	});

	it('filters the queue when searching', async () => {
		const { getByPlaceholderText, queryByText, getAllByText } = render(AcerolaProcessDrawer, {
			props: { data: { processes: [chrome, explorer] } }
		});

		const input = getByPlaceholderText('Buscar aplicativo ou PID...');
		await fireEvent.input(input, { target: { value: 'explorer' } });

		expect(getAllByText('explorer.exe').length).toBeGreaterThanOrEqual(1);
		expect(queryByText('chrome.exe')).not.toBeInTheDocument();
	});

	it('handles empty process list gracefully', () => {
		const { getByText } = render(AcerolaProcessDrawer, {
			props: { data: { processes: [] } }
		});

		expect(getByText('Selecione um processo na lista ao lado')).toBeInTheDocument();
	});

	it('opens bottom-up PID drawer when expand button is clicked and closes when minimize is clicked', async () => {
		const { getByText, getByPlaceholderText, queryByText, getAllByText } = render(
			AcerolaProcessDrawer,
			{
				props: { data: { processes: [chrome, explorer] } }
			}
		);

		// Drawer initially closed
		expect(queryByText('Instâncias e Threads de chrome.exe')).not.toBeInTheDocument();

		// Click expand button
		const expandButton = getAllByText('Expandir PIDs')[0];
		await fireEvent.click(expandButton);

		// Drawer is open
		expect(getByText('Instâncias e Threads de chrome.exe')).toBeInTheDocument();
		expect(getByPlaceholderText('Filtrar PID...')).toBeInTheDocument();
		expect(getByText('Copiar PIDs')).toBeInTheDocument();

		// Click minimize button
		const minimizeButton = getByText('Recolher');
		await fireEvent.click(minimizeButton);

		// Drawer is closed
		expect(queryByText('Instâncias e Threads de chrome.exe')).not.toBeInTheDocument();
	});

	it('filters PIDs within the expanded drawer', async () => {
		const { getByText, getByPlaceholderText, queryByText, getAllByText } = render(
			AcerolaProcessDrawer,
			{
				props: { data: { processes: [chrome, explorer] } }
			}
		);

		// Open drawer
		const expandBtn = getAllByText('Expandir PIDs')[0];
		await fireEvent.click(expandBtn);

		const searchInput = getByPlaceholderText('Filtrar PID...');
		await fireEvent.input(searchInput, { target: { value: '8130' } });

		expect(getAllByText('PID 8130').length).toBeGreaterThanOrEqual(2);
		expect(getAllByText('PID 8120').length).toBe(1);
	});

	/** Abre a gaveta de PIDs e devolve a língua (o puxador do topo). */
	async function openPidDrawer() {
		const view = render(AcerolaProcessDrawer, {
			props: { data: { processes: [chrome, explorer] } }
		});
		await fireEvent.click(view.getAllByText('Expandir PIDs')[0]);

		return { ...view, handle: view.getByRole('button', { name: /Recolher gaveta — arraste/ }) };
	}

	// feliz
	it('closes the PID drawer from the footer button', async () => {
		const { getByText, queryByText } = await openPidDrawer();

		await fireEvent.click(getByText('Fechar Gaveta'));

		expect(queryByText('Instâncias e Threads de chrome.exe')).not.toBeInTheDocument();
	});

	// feliz
	it('closes the PID drawer when the handle is clicked', async () => {
		const { handle, queryByText } = await openPidDrawer();

		await fireEvent.click(handle);

		expect(queryByText('Instâncias e Threads de chrome.exe')).not.toBeInTheDocument();
	});

	// feliz
	it('closes the PID drawer when the handle is dragged down past the limit', async () => {
		const { handle, queryByText } = await openPidDrawer();

		await fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 });
		await fireEvent.pointerMove(handle, { clientY: 260, pointerId: 1 });
		await fireEvent.pointerUp(handle, { clientY: 260, pointerId: 1 });

		expect(queryByText('Instâncias e Threads de chrome.exe')).not.toBeInTheDocument();
	});

	// triste
	it('keeps the PID drawer open after a short drag, even with the click that follows it', async () => {
		const { handle, getByText } = await openPidDrawer();

		await fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 });
		await fireEvent.pointerMove(handle, { clientY: 130, pointerId: 1 });
		await fireEvent.pointerUp(handle, { clientY: 130, pointerId: 1 });
		await fireEvent.click(handle);

		expect(getByText('Instâncias e Threads de chrome.exe')).toBeInTheDocument();
	});

	// triste
	it('ignores an upward drag on the handle', async () => {
		const { handle, getByText } = await openPidDrawer();

		await fireEvent.pointerDown(handle, { clientY: 300, pointerId: 1 });
		await fireEvent.pointerMove(handle, { clientY: 40, pointerId: 1 });
		await fireEvent.pointerUp(handle, { clientY: 40, pointerId: 1 });
		await fireEvent.click(handle);

		expect(getByText('Instâncias e Threads de chrome.exe')).toBeInTheDocument();
	});

	it('closes expanded drawer on Escape key', async () => {
		const { getByText, queryByText, getAllByText } = render(AcerolaProcessDrawer, {
			props: { data: { processes: [chrome, explorer] } }
		});

		const expandBtn = getAllByText('Expandir PIDs')[0];
		await fireEvent.click(expandBtn);
		expect(getByText('Instâncias e Threads de chrome.exe')).toBeInTheDocument();

		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(queryByText('Instâncias e Threads de chrome.exe')).not.toBeInTheDocument();
	});
});
