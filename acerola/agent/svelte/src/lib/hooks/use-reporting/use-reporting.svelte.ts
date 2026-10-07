import type { ReportingState } from '$lib/components/acerola-reporting-card/acerola-reporting-card.svelte';
import {
	ReportingSettings,
	ReportingState as readReportingState,
	SaveReportingSettings
} from '../../../../wailsjs/go/main/App';

/**
 * O envio ao painel central, como as telas do agente o enxergam.
 *
 * O Go é a fonte da verdade: aqui só se pergunta o que está salvo e em que pé
 * está a conexão. A CHAVE NUNCA VOLTA — só a informação de que existe uma —,
 * porque trazê-la recolocaria em texto puro, na memória da tela, o segredo que
 * acabou de ser cifrado em disco.
 *
 * O estado é compartilhado pela popup e pelo dashboard, como o de métricas: as
 * duas telas mostram o mesmo card, e cada uma perguntando por conta própria
 * daria respostas diferentes na mesma máquina.
 */

/** De quanto em quanto tempo a tela pergunta como está a conexão. */
const STATE_POLL_MS = 2000;

let serverUrl = $state('');
let hasToken = $state(false);
let connectionState = $state<ReportingState>('off');
let isSaving = $state(false);
let error = $state('');

/* Quantas telas estão olhando agora. A pergunta periódica só existe enquanto
   alguém a lê: com a janela escondida ela seria trabalho para ninguém. */
let watchers = 0;
let poll: ReturnType<typeof setInterval> | null = null;

async function refresh() {
	const [settings, state] = await Promise.all([ReportingSettings(), readReportingState()]);

	serverUrl = settings.serverUrl ?? '';
	hasToken = settings.hasToken ?? false;
	connectionState = state as ReportingState;
}

async function save(nextServerUrl: string, token: string) {
	isSaving = true;
	error = '';

	try {
		/* O Go devolve a recusa já em português, ou vazio quando deu certo — é a
		   única mensagem dele escrita para ser lida por gente. */
		error = await SaveReportingSettings(nextServerUrl, token);
	} finally {
		isSaving = false;
	}

	await refresh();
}

/**
 * watch liga a atualização periódica e devolve como desligá-la. Chame no
 * `onMount` da tela e devolva o resultado na limpeza.
 */
function watch(): () => void {
	watchers += 1;
	void refresh();

	poll ??= setInterval(() => void refresh(), STATE_POLL_MS);

	return () => {
		watchers -= 1;
		if (watchers > 0 || poll === null) return;

		clearInterval(poll);
		poll = null;
	};
}

export function useReporting() {
	return {
		get card() {
			return { serverUrl, hasToken, state: connectionState };
		},
		get state() {
			return { isSaving, error };
		},
		save,
		watch
	};
}
