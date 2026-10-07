<script module lang="ts">
	// Quem é este agente e de qual máquina ele fala: logo, nome, o selo de "ao vivo" e a linha da
	// estação. Fica no canto esquerdo do cabeçalho do painel. É componente, e não marcação da
	// tela, porque o tamanho do logo e o desenho do selo são decisão de componente.
	export type AcerolaAgentIdentityProps = {
		data: {
			/** Já chegou alguma leitura do Go? Enquanto não, o selo diz "Conectando". */
			isLive: boolean;
			/** A linha da estação (nome, sistema, tempo ligada); sem leitura, não aparece. */
			subtitle?: string;
		};
		ui?: { class?: string };
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils/cn';

	let { data, ui }: AcerolaAgentIdentityProps = $props();
</script>

<div class={cn('flex items-center gap-3', ui?.class)}>
	<div class="relative flex items-center justify-center">
		<img src="/favicon.svg" alt="Acerola" class="h-8 w-8" />
	</div>

	<div>
		<div class="flex items-center gap-2">
			<h1 class="text-foreground text-sm font-semibold tracking-tight">Acerola Agent</h1>

			<span
				class="border-success/20 bg-success/10 text-success inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold"
			>
				<span class="relative flex h-1.5 w-1.5">
					<span
						class="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
					></span>
					<span class="bg-success relative inline-flex h-1.5 w-1.5 rounded-full"></span>
				</span>
				{data.isLive ? 'Ao vivo' : 'Conectando'}
			</span>
		</div>

		{#if data.subtitle}
			<!-- 11px de propósito: em 12px esta linha quebra em duas na janela de 1100px e empurra as
			     abas do cabeçalho. É a única exceção à regra do `text-xs`. -->
			<p class="text-muted-foreground text-[11px]">{data.subtitle}</p>
		{/if}
	</div>
</div>
