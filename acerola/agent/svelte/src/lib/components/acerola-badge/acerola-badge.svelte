<script module lang="ts">
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge';

	export type AcerolaBadgeTone = 'default' | 'online' | 'offline';

	export type AcerolaBadgeProps = {
		ui?: {
			tone?: AcerolaBadgeTone;
			class?: string;
		};
	};

	const TONE_VARIANT: Record<AcerolaBadgeTone, BadgeVariant> = {
		default: 'secondary',
		online: 'default',
		offline: 'destructive'
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	let { ui, children }: AcerolaBadgeProps & { children?: Snippet } = $props();

	const toneClass = $derived(ui?.tone === 'online' ? 'bg-chart-4 text-base' : undefined);
</script>

<Badge variant={TONE_VARIANT[ui?.tone ?? 'default']} class={cn('uppercase', toneClass, ui?.class)}>
	{@render children?.()}
</Badge>
