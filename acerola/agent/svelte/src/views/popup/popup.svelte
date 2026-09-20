<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import AcerolaCard from '$lib/components/acerola-card/acerola-card.svelte';
	import AcerolaThemeToggle from '$lib/components/acerola-theme-toggle/acerola-theme-toggle.svelte';
	import { useMetrics } from '$lib/metrics/store.svelte';
	import { bytes, percent, uptime } from '$lib/utils/format';
	import { HideWindow } from '../../../wailsjs/go/main/App';

	const metrics = useMetrics();

	// "Fecha ao perder foco": o WebView2 dispara blur no `window` do DOM
	// quando a janela nativa perde o foco — não precisa de nenhuma API
	// extra do Wails pra detectar isso.
	function onBlur() {
		HideWindow();
	}

	onMount(() => window.addEventListener('blur', onBlur));
	onDestroy(() => window.removeEventListener('blur', onBlur));
</script>

<div
	data-drag-region
	class="border-border bg-background flex h-full flex-col gap-2 rounded-lg border p-3 shadow-2xl"
>
	<header class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<img src="/favicon.svg" alt="" class="h-6 w-6" />
			<span class="text-sm font-semibold">Acerola Agent</span>
		</div>
		<AcerolaThemeToggle />
	</header>

	{#if metrics.latest}
		{@const snap = metrics.latest}
		<div class="grid grid-cols-2 gap-2">
			<AcerolaCard data={{ title: 'CPU' }}>
				<p class="text-xl font-semibold tabular-nums">{percent(snap.cpu.percentTotal)}</p>
			</AcerolaCard>
			<AcerolaCard data={{ title: 'Memória' }}>
				<p class="text-xl font-semibold tabular-nums">{percent(snap.memory.usedPercent)}</p>
			</AcerolaCard>
		</div>

		<AcerolaCard data={{ title: 'Máquina' }} ui={{ class: 'flex-1' }}>
			<dl class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
				<dt class="text-muted-foreground">Computador</dt>
				<dd class="text-right font-medium">{snap.host.hostname}</dd>
				<dt class="text-muted-foreground">IP local</dt>
				<dd class="text-right font-medium">{snap.host.localIp || '—'}</dd>
				<dt class="text-muted-foreground">Disco livre</dt>
				<dd class="text-right font-medium">{bytes(snap.host.freeDiskBytes)}</dd>
				<dt class="text-muted-foreground">Ligado há</dt>
				<dd class="text-right font-medium">{uptime(snap.host.uptimeSeconds)}</dd>
			</dl>
		</AcerolaCard>
	{:else}
		<p class="text-muted-foreground flex-1 text-sm">Coletando métricas…</p>
	{/if}
</div>
