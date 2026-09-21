<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AcerolaProcessTable from './acerola-process-table.svelte';

	const { Story } = defineMeta({
		title: 'Components/AcerolaProcessTable',
		component: AcerolaProcessTable
	});

	const chrome = {
		name: 'chrome.exe',
		instanceCount: 3,
		cpuPercent: 12.4,
		memPercent: 16.2,
		memBytes: 2_600_000_000,
		instances: [
			{ pid: 8120, cpuPercent: 8.1, memPercent: 7.4, memBytes: 1_200_000_000 },
			{ pid: 8122, cpuPercent: 3.2, memPercent: 6.1, memBytes: 1_000_000_000 },
			{ pid: 8130, cpuPercent: 1.1, memPercent: 2.7, memBytes: 400_000_000 }
		]
	};

	const explorer = {
		name: 'explorer.exe',
		instanceCount: 1,
		cpuPercent: 4.2,
		memPercent: 1.8,
		memBytes: 180_000_000,
		instances: [{ pid: 4410, cpuPercent: 4.2, memPercent: 1.8, memBytes: 180_000_000 }]
	};

	const code = {
		name: 'Code.exe',
		instanceCount: 7,
		cpuPercent: 9.7,
		memPercent: 11.3,
		memBytes: 1_800_000_000,
		instances: Array.from({ length: 7 }, (_, index) => ({
			pid: 5000 + index,
			cpuPercent: 9.7 / 7,
			memPercent: 11.3 / 7,
			memBytes: 1_800_000_000 / 7
		}))
	};
</script>

<Story name="Default" args={{ data: { processes: [chrome, code, explorer] } }} />

<Story name="Single Instance Only" args={{ data: { processes: [explorer] } }} />

<Story name="Many Instances" args={{ data: { processes: [code] } }} />

<Story name="Empty (edge case)" args={{ data: { processes: [] } }} />
