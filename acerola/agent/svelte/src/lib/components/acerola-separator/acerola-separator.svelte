<script module lang="ts">
	export type AcerolaSeparatorProps = {
		ui?: {
			orientation?: 'horizontal' | 'vertical';
			class?: string;
		};
	};
</script>

<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';

	let { ui }: AcerolaSeparatorProps = $props();
</script>

<Separator orientation={ui?.orientation ?? 'horizontal'} class={ui?.class} />
