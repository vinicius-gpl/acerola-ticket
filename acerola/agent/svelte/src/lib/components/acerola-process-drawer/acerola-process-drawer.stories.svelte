<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AcerolaProcessDrawer from './acerola-process-drawer.svelte';

	const { Story } = defineMeta({
		title: 'Components/AcerolaProcessDrawer',
		component: AcerolaProcessDrawer
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

	const code = {
		name: 'Code.exe',
		instanceCount: 6,
		cpuPercent: 9.7,
		memPercent: 11.3,
		memBytes: 1_800_000_000,
		instances: Array.from({ length: 6 }, (_, index) => ({
			pid: 5000 + index,
			cpuPercent: 9.7 / 6,
			memPercent: 11.3 / 6,
			memBytes: 1_800_000_000 / 6
		}))
	};

	const svchost = {
		name: 'svchost.exe',
		instanceCount: 14,
		cpuPercent: 1.8,
		memPercent: 4.5,
		memBytes: 720_000_000,
		instances: Array.from({ length: 14 }, (_, index) => ({
			pid: 1000 + index * 4,
			cpuPercent: 1.8 / 14,
			memPercent: 4.5 / 14,
			memBytes: 720_000_000 / 14
		}))
	};

	const explorer = {
		name: 'explorer.exe',
		instanceCount: 1,
		cpuPercent: 3.2,
		memPercent: 1.8,
		memBytes: 180_000_000,
		instances: [{ pid: 4410, cpuPercent: 3.2, memPercent: 1.8, memBytes: 180_000_000 }]
	};
</script>

<Story
	name="Default Queue & Drawer"
	args={{ data: { processes: [chrome, code, svchost, explorer] } }}
/>

<Story name="Empty Queue" args={{ data: { processes: [] } }} />
