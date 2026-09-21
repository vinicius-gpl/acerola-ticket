import { EventsOn } from '../../../wailsjs/runtime/runtime';
import type { Snapshot } from './types';

const MAX_HISTORY = 120; // ~2 minutos de histórico a 1 amostra/segundo

let latest = $state<Snapshot | null>(null);
let history = $state<Snapshot[]>([]);

// Assina o evento "metrics:snapshot" emitido pelo Go (ver app.go,
// forwardSnapshots) uma única vez, na carga do módulo — tanto a popup
// quanto o dashboard leem do mesmo estado compartilhado.
EventsOn('metrics:snapshot', (snapshot: Snapshot) => {
	latest = snapshot;
	history = [...history, snapshot].slice(-MAX_HISTORY);
});

export function useMetrics() {
	return {
		get latest() {
			return latest;
		},
		get history() {
			return history;
		}
	};
}
