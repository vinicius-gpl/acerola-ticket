<script module lang="ts">
	export type ReportingState = 'off' | 'connecting' | 'connected' | 'rejected' | 'blocked';

	export type AcerolaReportingCardProps = {
		data: {
			/** O endereço já salvo. Vazio na primeira vez. */
			serverUrl: string;
			/** Existe uma chave guardada? O VALOR dela nunca chega aqui. */
			hasToken: boolean;
			state: ReportingState;
		};
		state?: {
			isSaving?: boolean;
			/** A recusa, em português, vinda de quem tentou salvar. */
			error?: string;
		};
		events?: {
			onSave?: (serverUrl: string, token: string) => void;
		};
	};

	/**
	 * O que cada situação diz para quem está na máquina — e o que fazer com ela.
	 * Frase curta: o card é pequeno, e quem lê quer saber se deu certo.
	 */
	const STATE_LABEL: Record<ReportingState, string> = {
		off: 'Não configurado',
		connecting: 'Conectando…',
		connected: 'Conectado',
		rejected: 'Chave recusada',
		blocked: 'Bloqueada pelo TI'
	};

	const STATE_HINT: Record<ReportingState, string> = {
		off: 'Cole a chave que o painel mostrou ao cadastrar este computador.',
		connecting: 'Procurando o painel.',
		connected: 'Esta máquina está aparecendo no painel.',
		rejected: 'O painel não reconheceu a chave. Gere outra na ficha da máquina e cole aqui.',
		blocked: 'O TI bloqueou esta máquina no painel.'
	};

	const STATE_TONE: Record<ReportingState, AcerolaBadgeTone> = {
		off: 'default',
		connecting: 'default',
		connected: 'online',
		rejected: 'offline',
		blocked: 'offline'
	};
</script>

<script lang="ts">
	import AcerolaBadge, {
		type AcerolaBadgeTone
	} from '$lib/components/acerola-badge/acerola-badge.svelte';
	import AcerolaButton from '$lib/components/acerola-button/acerola-button.svelte';
	import AcerolaCard from '$lib/components/acerola-card/acerola-card.svelte';

	let { data, state: cardState, events }: AcerolaReportingCardProps = $props();

	/* Puramente visual: o que está digitado agora.
	   O endereço só existe aqui DEPOIS que alguém digita — antes disso vale o que
	   está salvo. Copiar o valor para dentro na montagem daria um campo em branco
	   para sempre, porque o que está salvo só chega do Go um instante depois.
	   A chave começa sempre em branco: a salva não volta, por ser segredo. */
	let editedServerUrl = $state<string | null>(null);
	let token = $state('');

	const serverUrl = $derived(editedServerUrl ?? data.serverUrl);

	const isSaving = $derived(cardState?.isSaving === true);

	/* Salvar sem chave nova só faria sentido para trocar o endereço, e trocar o
	   endereço sem chave não conecta. Então os dois são obrigatórios. */
	const canSave = $derived(!isSaving && serverUrl.trim() !== '' && token.trim() !== '');

	const fieldClass =
		'bg-muted/40 border-border/60 text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-hidden w-full rounded-control border px-2.5 py-1.5 font-mono text-xs transition-colors';

	function save() {
		if (!canSave) return;

		events?.onSave?.(serverUrl.trim(), token.trim());
		/* A chave sai da tela assim que é entregue: ela já foi guardada cifrada,
		   e deixá-la no campo a manteria legível em memória sem necessidade. */
		token = '';
		/* E o endereço volta a seguir o que está salvo, que é o que o Go acabou de
		   normalizar — o que aparece na tela passa a ser o que vale de verdade. */
		editedServerUrl = null;
	}
</script>

<AcerolaCard data={{ title: 'Painel central' }} ui={{ size: 'sm', class: 'p-3.5' }}>
	{#snippet headerAction()}
		<AcerolaBadge ui={{ tone: STATE_TONE[data.state] }}>{STATE_LABEL[data.state]}</AcerolaBadge>
	{/snippet}

	<div class="flex flex-col gap-2.5">
		<p class="text-muted-foreground text-xs leading-snug">{STATE_HINT[data.state]}</p>

		<label class="flex flex-col gap-1">
			<span class="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
				Endereço do painel
			</span>
			<input
				class={fieldClass}
				type="text"
				value={serverUrl}
				oninput={(event) => (editedServerUrl = event.currentTarget.value)}
				disabled={isSaving}
				placeholder="http://painel.da.empresa"
			/>
		</label>

		<label class="flex flex-col gap-1">
			<span class="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
				Chave desta máquina
			</span>
			<!-- `password`: a chave não fica à mostra para quem passa atrás de quem digita. -->
			<input
				class={fieldClass}
				type="password"
				bind:value={token}
				disabled={isSaving}
				autocomplete="off"
				placeholder={data.hasToken
					? 'Já existe uma chave salva — cole outra para trocar'
					: 'Cole a chave aqui'}
			/>
		</label>

		{#if cardState?.error}
			<p class="text-destructive text-xs leading-snug">{cardState.error}</p>
		{/if}

		<AcerolaButton
			ui={{ size: 'sm', disabled: !canSave, class: 'w-full' }}
			events={{ onClick: save }}
		>
			{isSaving ? 'Salvando…' : 'Salvar'}
		</AcerolaButton>

		<p class="text-muted-foreground text-xs leading-snug">
			A chave é guardada cifrada nesta máquina, para este usuário do Windows. Copiar o arquivo para
			outro computador não abre.
		</p>
	</div>
</AcerolaCard>
