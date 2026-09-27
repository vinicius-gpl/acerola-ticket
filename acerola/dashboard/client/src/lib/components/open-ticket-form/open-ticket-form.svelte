<script lang="ts" module>
  import {
    TICKET_DEPARTMENTS,
    TICKET_DEPARTMENT_LABELS,
    TICKET_PROBLEM_TYPE_LABELS,
    TICKET_PROBLEM_TYPES,
  } from '@template/shared/domain/ticket-catalog.util';
  import { sanitizePhoneInput } from '@template/shared/domain/phone.util';
  import {
    TICKET_PRIORITIES,
    TICKET_PRIORITY_LABELS,
    ticketPriorityTone,
  } from '@template/shared/domain/ticket-status.util';
  import { type FormFieldState } from '$lib/types/form-field.type';

  export type OpenTicketField =
    | 'requesterName'
    | 'department'
    | 'problemType'
    | 'anydeskId'
    | 'priority'
    | 'contactPhone'
    | 'description';

  /**
   * O formulário PÚBLICO de abrir chamado — em ETAPAS, uma por vez, tipo onboarding.
   *
   * Função pura de props: o valor e o erro de cada campo chegam prontos (`FormFieldState`), e
   * por isso a tela abre no Storybook preenchida, com erro, enviando e já com o protocolo —
   * sem servidor e sem biblioteca de formulário no meio.
   *
   * Qual etapa está na tela é `$state` puramente visual (como mostrar/esconder senha): não é
   * dado do chamado, é só qual pedaço do formulário está na frente. Por isso pode crescer —
   * uma etapa nova é só mais uma entrada no array de baixo, nunca mais scroll na etapa atual.
   *
   * Depois de abrir, o formulário SAI DA TELA e dá lugar ao protocolo. É o único dado que a
   * pessoa precisa guardar, e mostrá-lo num aviso ao lado do formulário preenchido é a forma
   * mais certa de ela fechar a página sem anotar.
   */
  export type OpenTicketFormProps = {
    data: {
      fields: Record<OpenTicketField, FormFieldState>;
      notifyWhatsapp: boolean;
      screenshotName: string | null;
      opened: { protocol: string; whatsAppLink: string | null } | null;
    };
    state: { isSubmitting?: boolean; error?: string | null };
    actions: {
      onChange: (field: OpenTicketField, value: string) => void;
      onBlur: (field: OpenTicketField) => void;
      onNotifyChange: (notify: boolean) => void;
      onScreenshotChange: (file: File | null) => void;
      onSubmit: () => void;
      onOpenAnother: () => void;
    };
  };

  const DEPARTMENT_OPTIONS = TICKET_DEPARTMENTS.map((department) => ({
    value: department,
    label: TICKET_DEPARTMENT_LABELS[department],
  }));

  const PROBLEM_TYPE_OPTIONS = TICKET_PROBLEM_TYPES.map((type) => ({
    value: type,
    label: TICKET_PROBLEM_TYPE_LABELS[type],
  }));

  const PRIORITY_OPTIONS = TICKET_PRIORITIES.map((priority) => ({
    value: priority,
    label: TICKET_PRIORITY_LABELS[priority],
    tone: ticketPriorityTone(priority),
  }));

  /** Uma etapa do onboarding: o cabeçalho (ícone, título) e quais campos ela valida. */
  type StepId = 'who' | 'problem' | 'what' | 'notify';

  const STEP_FIELDS: Record<StepId, OpenTicketField[]> = {
    who: ['requesterName', 'contactPhone'],
    problem: ['department', 'problemType', 'priority', 'anydeskId'],
    what: ['description'],
    notify: [],
  };

  const STEP_ORDER: StepId[] = ['who', 'problem', 'what', 'notify'];

  /**
   * Só os campos que PODEM chegar vazios e são obrigatórios — departamento, tipo e urgência
   * sempre têm um valor (vêm com padrão do próprio seletor), então travar "Avançar" neles
   * não faria sentido: não tem como ficarem vazios.
   */
  const REQUIRED_FIELDS: Partial<Record<StepId, OpenTicketField[]>> = {
    who: ['requesterName', 'contactPhone'],
    what: ['description'],
  };

  function missingRequiredFields(
    step: StepId,
    fields: Record<OpenTicketField, FormFieldState>,
  ): OpenTicketField[] {
    return (REQUIRED_FIELDS[step] ?? []).filter((name) => fields[name].value.trim() === '');
  }

  /** A primeira etapa com campo em erro — pra onde pular quando um envio falha. */
  function firstStepWithError(
    fields: Record<OpenTicketField, FormFieldState>,
  ): number {
    return STEP_ORDER.findIndex((step) =>
      STEP_FIELDS[step].some((name) => Boolean(fields[name].error)),
    );
  }
</script>

<script lang="ts">
  import { DESCRIPTION_MAX_LENGTH } from '@template/shared/schemas/ticket.schema';

  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import PaperclipIcon from '@lucide/svelte/icons/paperclip';
  import UserIcon from '@lucide/svelte/icons/user';
  import WrenchIcon from '@lucide/svelte/icons/wrench';
  import XIcon from '@lucide/svelte/icons/x';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import OptionPicker from '$lib/components/option-picker/option-picker.svelte';
  import SubmitButton from '$lib/components/submit-button/submit-button.svelte';
  import TextAreaField from '$lib/components/text-area-field/text-area-field.svelte';
  import TextField from '$lib/components/text-field/text-field.svelte';
  import Timeline from '$lib/components/timeline/timeline.svelte';
  import TimelineStep from '$lib/components/timeline-step/timeline-step.svelte';
  import { fadeInUp } from '$lib/motion/motion';
  import { cn } from '$lib/utils/cn';

  let { data, state: formState, actions }: OpenTicketFormProps = $props();

  const fields = $derived(data.fields);

  /* Puramente visual: qual etapa está na tela agora. Não é dado do chamado. */
  let stepIndex = $state(0);
  /* Conta os envios para só pular de etapa UMA vez por tentativa — sem isso, o efeito abaixo
     brigaria com a pessoa a cada campo que ela corrigisse depois. */
  let submitAttempt = $state(0);
  let jumpedAtAttempt = $state(0);

  const stepId = $derived(STEP_ORDER[stepIndex] ?? 'who');
  const isFirstStep = $derived(stepIndex === 0);
  const isLastStep = $derived(stepIndex === STEP_ORDER.length - 1);

  /* Depois de uma tentativa de envio que falhou na validação, volta pra primeira etapa com
     campo em erro — sem isso a recusa aparece só na última etapa, sem dizer o que está
     errado nas de trás. */
  $effect(() => {
    if (submitAttempt === jumpedAtAttempt) return;

    const target = firstStepWithError(fields);
    if (target === -1) return;

    stepIndex = target;
    jumpedAtAttempt = submitAttempt;
  });

  let stepContentEl: HTMLDivElement | undefined = $state();

  /* Anima só a TROCA de etapa, não a primeira pintura (senão o formulário nasceria
     desaparecendo). `routeKey`-like: o efeito escuta `stepIndex`, e a checagem de "primeira
     vez" evita animar o carregamento inicial da tela. */
  let hasMountedStep = false;
  $effect(() => {
    void stepIndex;
    if (hasMountedStep) fadeInUp(stepContentEl ?? null);
    hasMountedStep = true;
  });

  function goBack(): void {
    if (!isFirstStep) stepIndex -= 1;
  }

  function goNext(): void {
    if (isLastStep) return;

    /* Trava o avanço quando falta campo obrigatório — e força o erro a aparecer (`onBlur`)
       pra pessoa ver O QUÊ falta, não só que não avançou. */
    const missing = missingRequiredFields(stepId, fields);
    if (missing.length > 0) {
      missing.forEach((name) => actions.onBlur(name));
      return;
    }

    stepIndex += 1;
  }

  /* Enter sempre passa por aqui. Nas etapas do meio, ele avança em vez de tentar enviar um
     formulário que ainda não tem botão de enviar. */
  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    if (!isLastStep) {
      goNext();
      return;
    }

    submitAttempt += 1;
    actions.onSubmit();
  }

  let screenshotInput: HTMLInputElement | undefined = $state();

  function handleFile(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    actions.onScreenshotChange(input.files?.[0] ?? null);
  }

  /* O `<input type="file">` não deixa "desmarcar" um arquivo por código sem limpar o próprio
     valor: sem isso, escolher o MESMO arquivo de novo depois de remover não dispara `onchange`
     nenhum, e a pessoa acha que o botão de remover não funcionou. */
  function removeFile(): void {
    actions.onScreenshotChange(null);
    if (screenshotInput) screenshotInput.value = '';
  }
</script>

<section class="bg-card rounded-xl border p-5">
  {#if data.opened}
    <!-- O protocolo ocupa a tela inteira: é o que a pessoa precisa levar daqui. -->
    <div class="flex flex-col items-center gap-3 py-6 text-center">
      <p class="text-ink-700 text-sm">Chamado aberto. Seu protocolo é:</p>
      <strong class="text-primary text-3xl font-bold tracking-wide">{data.opened.protocol}</strong>
      <p class="text-ink-500 max-w-md text-sm">
        Guarde este número — é com ele que você acompanha o andamento aqui mesmo.
      </p>

      {#if data.opened.whatsAppLink}
        <a
          class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-semibold"
          href={data.opened.whatsAppLink}
          target="_blank"
          rel="noopener"
        >
          Receber o protocolo no WhatsApp
        </a>
      {/if}

      <ActionButton
        data={{ label: 'Abrir outro chamado' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onOpenAnother }}
      />
    </div>
  {:else}
    <div class="mb-4 flex items-center justify-between gap-3">
      <h2 class="text-ink-900 text-lg font-bold">Abrir chamado</h2>
      <span class="text-ink-500 text-xs font-medium tabular-nums">
        Etapa {stepIndex + 1} de {STEP_ORDER.length}
      </span>
    </div>

    <!-- Barra de progresso: um segmento por etapa, preenchido até a atual. -->
    <div class="mb-2 flex gap-1.5" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={STEP_ORDER.length}>
      {#each STEP_ORDER as step, index (step)}
        <span
          class={cn(
            'h-1.5 flex-1 rounded-full transition-colors',
            index <= stepIndex ? 'bg-primary' : 'bg-muted',
          )}
        ></span>
      {/each}
    </div>

    <!-- Campo sem marca é obrigatório; com "(opcional)" no rótulo, não é — a legenda deixa o
         `*` explícito pra quem vê pela primeira vez. -->
    <p class="text-ink-500 mb-5 text-xs">
      Campos com <span class="text-destructive font-semibold">*</span> são obrigatórios.
    </p>

    <form novalidate onsubmit={handleSubmit}>
      <!-- Uma etapa por vez: `Timeline` de um item só dá o cabeçalho (ícone + título) sem a
           linha de conexão, que só faz sentido quando há uma próxima etapa visível. -->
      <div bind:this={stepContentEl}>
      <Timeline>
        {#if stepId === 'who'}
          <TimelineStep data={{ title: 'Quem é você', icon: UserIcon }} ui={{ isLast: true, tone: 'brand' }}>
            <div class="grid gap-4 sm:grid-cols-2">
              <TextField
                data={{
                  label: 'Seu nome',
                  name: 'requesterName',
                  value: fields.requesterName.value,
                  placeholder: 'Digite seu nome',
                  isRequired: true,
                }}
                state={{
                  error: fields.requesterName.error,
                  isDisabled: formState.isSubmitting,
                  isAutoFocused: true,
                }}
                actions={{
                  onChange: (value: string) => actions.onChange('requesterName', value),
                  onBlur: () => actions.onBlur('requesterName'),
                }}
              />

              <TextField
                data={{
                  label: 'Seu WhatsApp (com DDD)',
                  name: 'contactPhone',
                  value: fields.contactPhone.value,
                  placeholder: 'Ex: 62 99999-9999',
                  isRequired: true,
                }}
                ui={{ type: 'tel' }}
                state={{ error: fields.contactPhone.error, isDisabled: formState.isSubmitting }}
                actions={{
                  onChange: (value: string) => actions.onChange('contactPhone', sanitizePhoneInput(value)),
                  onBlur: () => actions.onBlur('contactPhone'),
                }}
              />
            </div>
          </TimelineStep>
        {:else if stepId === 'problem'}
          <TimelineStep
            data={{ title: 'Sobre o problema', description: 'Ajuda a mandar pro time certo.', icon: WrenchIcon }}
            ui={{ isLast: true }}
          >
            <div class="flex flex-col gap-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="flex flex-col gap-1.5">
                  <span class="text-ink-700 text-sm font-medium">Departamento</span>
                  <OptionPicker
                    data={{ value: fields.department.value, options: DEPARTMENT_OPTIONS }}
                    ui={{ ariaLabel: 'Departamento', placeholder: 'Escolha o departamento', fullWidth: true }}
                    state={{ isDisabled: formState.isSubmitting }}
                    actions={{ onChange: (value: string) => actions.onChange('department', value) }}
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <span class="text-ink-700 text-sm font-medium">Tipo de problema</span>
                  <OptionPicker
                    data={{ value: fields.problemType.value, options: PROBLEM_TYPE_OPTIONS }}
                    ui={{ ariaLabel: 'Tipo de problema', placeholder: 'Escolha o tipo', fullWidth: true }}
                    state={{ isDisabled: formState.isSubmitting }}
                    actions={{ onChange: (value: string) => actions.onChange('problemType', value) }}
                  />
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <span class="text-ink-700 text-sm font-medium">Urgência</span>
                <OptionPicker
                  data={{ value: fields.priority.value, options: PRIORITY_OPTIONS }}
                  ui={{ ariaLabel: 'Urgência', fullWidth: true }}
                  state={{ isDisabled: formState.isSubmitting }}
                  actions={{ onChange: (value: string) => actions.onChange('priority', value) }}
                />
              </div>

              <TextField
                data={{
                  label: 'Número do AnyDesk (opcional)',
                  name: 'anydeskId',
                  value: fields.anydeskId.value,
                  placeholder: 'Ex: 123 456 789',
                }}
                state={{ error: fields.anydeskId.error, isDisabled: formState.isSubmitting }}
                actions={{
                  onChange: (value: string) => actions.onChange('anydeskId', value),
                  onBlur: () => actions.onBlur('anydeskId'),
                }}
              />
            </div>
          </TimelineStep>
        {:else if stepId === 'what'}
          <TimelineStep data={{ title: 'O que aconteceu', icon: PaperclipIcon }} ui={{ isLast: true }}>
            <TextAreaField
              data={{
                label: 'Descrição do problema',
                name: 'description',
                value: fields.description.value,
                placeholder: 'Descreva o problema com o máximo de detalhes possível',
                maxLength: DESCRIPTION_MAX_LENGTH,
                isRequired: true,
              }}
              ui={{ rows: 5 }}
              state={{ error: fields.description.error, isDisabled: formState.isSubmitting }}
              actions={{
                onChange: (value: string) => actions.onChange('description', value),
                onBlur: () => actions.onBlur('description'),
              }}
            />

            <div class="flex flex-col gap-1.5">
              <label class="text-ink-700 text-sm font-medium" for="screenshot">
                Print do erro (opcional)
              </label>
              <div class="flex items-center gap-2">
                <label
                  for="screenshot"
                  class="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/20 px-3.5 py-3 text-xs text-muted-foreground transition-colors hover:bg-muted/40"
                >
                  <PaperclipIcon class="size-3.5 shrink-0" aria-hidden="true" />
                  <span class="truncate">{data.screenshotName ?? 'Escolher um arquivo de imagem'}</span>
                </label>
                {#if data.screenshotName}
                  <button
                    type="button"
                    onclick={removeFile}
                    aria-label="Remover o print anexado"
                    class="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/80 transition-colors"
                  >
                    <XIcon class="size-4" aria-hidden="true" />
                  </button>
                {/if}
              </div>
              <input
                bind:this={screenshotInput}
                id="screenshot"
                name="screenshot"
                type="file"
                accept="image/*"
                disabled={formState.isSubmitting}
                onchange={handleFile}
                class="sr-only"
              />
            </div>
          </TimelineStep>
        {:else}
          <TimelineStep data={{ title: 'Como te avisamos', icon: MessageCircle }} ui={{ isLast: true, tone: 'success' }}>
            <label
              class="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/80 bg-muted/20 px-3.5 py-3 text-sm text-ink-700 transition-colors hover:bg-muted/40"
            >
              <input
                type="checkbox"
                class="mt-0.5"
                checked={data.notifyWhatsapp}
                disabled={formState.isSubmitting}
                onchange={(event) => actions.onNotifyChange(event.currentTarget.checked)}
              />
              Quero receber o protocolo e avisos deste chamado no WhatsApp
            </label>

            {#if formState.error}
              <div class="mt-3">
                <ErrorState data={{ message: formState.error }} ui={{ variant: 'inline' }} />
              </div>
            {/if}
          </TimelineStep>
        {/if}
      </Timeline>
      </div>

      <!-- Navegação: Voltar/Avançar são `type="button"` de propósito — só a última etapa tem
           botão de enviar de verdade, senão Enter na primeira etapa já mandaria o formulário
           inteiro com os campos de trás em branco. -->
      <div class="mt-5 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
        {#if isFirstStep}
          <span></span>
        {:else}
          <ActionButton
            data={{ label: 'Voltar' }}
            ui={{ variant: 'secondary', icon: ArrowLeftIcon }}
            state={{ isDisabled: formState.isSubmitting }}
            actions={{ onClick: goBack }}
          />
        {/if}

        {#if isLastStep}
          <SubmitButton
            data={{ label: 'Abrir chamado', loadingLabel: 'Abrindo…' }}
            state={{ isLoading: formState.isSubmitting }}
          />
        {:else}
          <ActionButton data={{ label: 'Avançar' }} actions={{ onClick: goNext }} />
        {/if}
      </div>
    </form>
  {/if}
</section>
