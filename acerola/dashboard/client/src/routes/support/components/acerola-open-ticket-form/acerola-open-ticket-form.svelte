<script lang="ts" module>
  import LaptopIcon from '@lucide/svelte/icons/laptop';
  import ServerIcon from '@lucide/svelte/icons/server';
  import WrenchIcon from '@lucide/svelte/icons/wrench';
  import { formatAnydeskInput } from '@template/shared/domain/anydesk.util';
  import { formatPhoneInput } from '@template/shared/domain/phone.util';
  import { screenshotAccept } from '@template/shared/domain/screenshot-catalog.util';
  import {
    TICKET_DEPARTMENTS,
    TICKET_DEPARTMENT_LABELS,
    ticketProblemTypeOptionsForArea,
    type TicketArea,
  } from '@template/shared/domain/ticket-catalog.util';
  import {
    TICKET_PRIORITIES,
    TICKET_PRIORITY_LABELS,
    ticketPriorityTone,
  } from '@template/shared/domain/ticket-status.util';
  import { type FormFieldState } from '$lib/types/form-field.type';

  export type OpenTicketField =
    | 'requesterName'
    | 'area'
    | 'department'
    | 'problemType'
    | 'anydeskId'
    | 'priority'
    | 'contactPhone'
    | 'description'
    | 'projectId';

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
  export type AcerolaOpenTicketFormProps = {
    data: {
      fields: Record<OpenTicketField, FormFieldState>;
      notifyWhatsapp: boolean;
      screenshotName: string | null;
      /** Os arquivos escolhidos, ainda não enviados. */
      attachments: File[];
      opened: { protocol: string; whatsAppLink: string | null } | null;
      systemProjects?: { value: string; label: string }[];
    };
    state: {
      isSubmitting?: boolean;
      error?: string | null;
      screenshotError?: string | null;
      attachmentError?: string | null;
      systemProjectsLoading?: boolean;
      systemProjectsError?: string | null;
    };
    actions: {
      onChange: (field: OpenTicketField, value: string) => void;
      onBlur: (field: OpenTicketField) => void;
      onNotifyChange: (notify: boolean) => void;
      onScreenshotChange: (file: File | null) => void;
      onAttachmentsChange: (files: File[]) => void;
      onAttachmentError: (message: string | null) => void;
      onSubmit: () => void;
      onOpenAnother: () => void;
    };
  };

  const DEPARTMENT_OPTIONS = TICKET_DEPARTMENTS.map((department) => ({
    value: department,
    label: TICKET_DEPARTMENT_LABELS[department],
  }));

  /**
   * As três áreas, como CARDS — a primeira escolha de quem abre o chamado, antes de qualquer
   * outro dado. Ícone e descrição são só texto de tela (não vêm do domínio, que só sabe o
   * valor e o rótulo).
   */
  const AREA_CARDS: { value: TicketArea; label: string; description: string; icon: typeof ServerIcon }[] =
    [
      { value: 'infra', label: 'Infraestrutura', description: 'Rede, impressora, computador, acesso remoto', icon: ServerIcon },
      { value: 'sistema', label: 'Sistema', description: 'Erro, pedido de melhoria, acesso a uma tela', icon: LaptopIcon },
      { value: 'manutencao', label: 'Manutenção', description: 'Ar-condicionado, mobiliário, iluminação, estrutura', icon: WrenchIcon },
    ];

  const PRIORITY_OPTIONS = TICKET_PRIORITIES.map((priority) => ({
    value: priority,
    label: TICKET_PRIORITY_LABELS[priority],
    tone: ticketPriorityTone(priority),
  }));

  /** Uma etapa do onboarding: o cabeçalho (ícone, título) e quais campos ela valida. */
  type StepId = 'area' | 'who' | 'problem' | 'what' | 'notify';

  const STEP_FIELDS: Record<StepId, OpenTicketField[]> = {
    area: ['area'],
    who: ['requesterName', 'contactPhone'],
    problem: ['department', 'problemType', 'priority', 'anydeskId', 'projectId'],
    what: ['description'],
    notify: [],
  };

  const STEP_ORDER: StepId[] = ['area', 'who', 'problem', 'what', 'notify'];

  /**
   * Só os campos que PODEM chegar vazios e são obrigatórios — departamento, tipo e urgência
   * sempre têm um valor (vêm com padrão do próprio seletor), então travar "Avançar" neles
   * não faria sentido: não tem como ficarem vazios. A ÁREA é a exceção de propósito: ela
   * nasce vazia, porque é a PRIMEIRA escolha, feita de verdade — nunca um padrão escondido.
   */
  const REQUIRED_FIELDS: Partial<Record<StepId, OpenTicketField[]>> = {
    area: ['area'],
    who: ['requesterName', 'contactPhone'],
    what: ['description'],
  };

  function missingRequiredFields(
    step: StepId,
    fields: Record<OpenTicketField, FormFieldState>,
    area: string,
  ): OpenTicketField[] {
    const required = [...(REQUIRED_FIELDS[step] ?? [])];
    if (step === 'problem' && area === 'sistema') required.push('projectId');

    return required.filter((name) => fields[name].value.trim() === '');
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
  import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import PaperclipIcon from '@lucide/svelte/icons/paperclip';
  import UserIcon from '@lucide/svelte/icons/user';
  import XIcon from '@lucide/svelte/icons/x';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import AttachmentPicker from '$lib/components/acerola-attachment-picker/acerola-attachment-picker.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import SubmitButton from '$lib/components/acerola-submit-button/acerola-submit-button.svelte';
  import TextAreaField from '$lib/components/acerola-text-area-field/acerola-text-area-field.svelte';
  import TextField from '$lib/components/acerola-text-field/acerola-text-field.svelte';
  import Timeline from '$lib/components/acerola-timeline/acerola-timeline.svelte';
  import TimelineStep from '$lib/components/acerola-timeline-step/acerola-timeline-step.svelte';
  import { fadeInUp } from '$lib/motion/motion';
  import { cn } from '$lib/utils/cn';

  let { data, state: formState, actions }: AcerolaOpenTicketFormProps = $props();

  const fields = $derived(data.fields);
  const systemProjects = $derived(data.systemProjects ?? []);

  /* As opções de tipo de problema dependem da ÁREA escolhida — Manutenção não tem "rede
     caiu" na lista, nem Infra tem "ar-condicionado". */
  const problemTypeOptions = $derived(
    ticketProblemTypeOptionsForArea(fields.area.value as TicketArea),
  );

  function handleAreaChange(value: string): void {
    actions.onChange('area', value);
    if (value !== 'sistema') actions.onChange('projectId', '');
    /* Trocar de área pode deixar o tipo escolhido fora da lista nova — o primeiro tipo da
       área nova é sempre válido, e evita mandar um tipo órfão no envio. */
    const firstOfArea = ticketProblemTypeOptionsForArea(value as TicketArea)[0];
    if (firstOfArea) actions.onChange('problemType', firstOfArea.value);
  }

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
    const missing = missingRequiredFields(stepId, fields, fields.area.value);
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
    /* Limpa SEMPRE, recusado ou não — senão escolher de novo o MESMO arquivo (pra tentar
       outro no lugar) não dispara `onchange` nenhum, e a pessoa acha que o botão travou. */
    input.value = '';
  }

  /* O `<input type="file">` não deixa "desmarcar" um arquivo por código sem limpar o próprio
     valor: sem isso, escolher o MESMO arquivo de novo depois de remover não dispara `onchange`
     nenhum, e a pessoa acha que o botão de remover não funcionou. */
  function removeFile(): void {
    actions.onScreenshotChange(null);
    if (screenshotInput) screenshotInput.value = '';
  }
</script>

<section class="bg-card rounded-surface border p-5">
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
          class="bg-primary text-primary-foreground hover:bg-primary/90 control-md rounded-control inline-flex items-center text-sm font-semibold"
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
        {#if stepId === 'area'}
          <TimelineStep
            data={{ title: 'Qual área atende seu pedido?', description: 'Escolha a que mais parece com o que você precisa.', icon: LayoutGridIcon }}
            ui={{ isLast: true, tone: 'brand' }}
          >
            <div class="grid gap-3 sm:grid-cols-3">
              {#each AREA_CARDS as card (card.value)}
                {@const isSelected = fields.area.value === card.value}
                <button
                  type="button"
                  disabled={formState.isSubmitting}
                  aria-pressed={isSelected}
                  onclick={() => handleAreaChange(card.value)}
                  class={cn(
                    'flex flex-col items-start gap-2 rounded-box border p-4 text-left transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border/80 bg-card hover:bg-muted/40',
                  )}
                >
                  <card.icon class="text-primary size-5" aria-hidden="true" />
                  <span class="text-ink-900 text-sm font-semibold">{card.label}</span>
                  <span class="text-ink-500 text-xs">{card.description}</span>
                </button>
              {/each}
            </div>

            {#if fields.area.error}
              <p class="text-destructive mt-3 text-xs">{fields.area.error}</p>
            {/if}
          </TimelineStep>
        {:else if stepId === 'who'}
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
                  onChange: (value: string) => actions.onChange('contactPhone', formatPhoneInput(value)),
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
              <!-- Departamento sozinho na linha: ele é um dropdown curto, e espremê-lo ao
                   lado do Tipo de problema (que em Manutenção/Sistema vira um grupo de
                   pastilhas) deixava as duas colunas com alturas bem diferentes, uma com
                   folga e a outra quebrando em duas linhas. -->
              <div class="flex flex-col gap-1.5">
                <span class="text-ink-700 text-sm font-medium">Departamento</span>
                <OptionPicker
                  data={{ value: fields.department.value, options: DEPARTMENT_OPTIONS }}
                  ui={{ ariaLabel: 'Departamento', placeholder: 'Escolha o departamento', fullWidth: true }}
                  state={{ isDisabled: formState.isSubmitting }}
                  actions={{ onChange: (value: string) => actions.onChange('department', value) }}
                />
              </div>

              {#if fields.area.value === 'sistema'}
                <div class="flex flex-col gap-1.5">
                  <span class="text-ink-700 text-sm font-medium">
                    Sistema relacionado <span class="text-destructive">*</span>
                  </span>
                  <OptionPicker
                    data={{ value: fields.projectId.value, options: systemProjects }}
                    ui={{
                      ariaLabel: 'Sistema relacionado',
                      placeholder: formState.systemProjectsLoading
                        ? 'Carregando sistemas…'
                        : 'Pesquise e selecione o sistema',
                      fullWidth: true,
                    }}
                    state={{
                      isDisabled:
                        formState.isSubmitting ||
                        formState.systemProjectsLoading ||
                        systemProjects.length === 0,
                    }}
                    actions={{ onChange: (value: string) => actions.onChange('projectId', value) }}
                  />
                  {#if fields.projectId.error}
                    <p class="text-destructive text-xs">{fields.projectId.error}</p>
                  {:else if formState.systemProjectsError}
                    <p class="text-destructive text-xs">{formState.systemProjectsError}</p>
                  {:else if !formState.systemProjectsLoading && systemProjects.length === 0}
                    <p class="text-muted-foreground text-xs">
                      Nenhum sistema está disponível para abrir este chamado agora.
                    </p>
                  {:else}
                    <p class="text-muted-foreground text-xs">
                      O chamado será vinculado a uma Issue no repositório selecionado.
                    </p>
                  {/if}
                </div>
              {/if}

              <div class="flex flex-col gap-1.5">
                <span class="text-ink-700 text-sm font-medium">Tipo de problema</span>
                <OptionPicker
                  data={{ value: fields.problemType.value, options: problemTypeOptions }}
                  ui={{ ariaLabel: 'Tipo de problema', placeholder: 'Escolha o tipo', fullWidth: true }}
                  state={{ isDisabled: formState.isSubmitting }}
                  actions={{ onChange: (value: string) => actions.onChange('problemType', value) }}
                />
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

              <!-- O AnyDesk só faz sentido em Infra — perguntar isso pra quem veio reportar
                   o ar-condicionado pingando seria confundir, não ajudar (#13). -->
              {#if fields.area.value === 'infra'}
              <TextField
                data={{
                  label: 'Número do AnyDesk (opcional)',
                  name: 'anydeskId',
                  value: fields.anydeskId.value,
                  placeholder: 'Ex: 123 456 789',
                }}
                state={{ error: fields.anydeskId.error, isDisabled: formState.isSubmitting }}
                actions={{
                  onChange: (value: string) => actions.onChange('anydeskId', formatAnydeskInput(value)),
                  onBlur: () => actions.onBlur('anydeskId'),
                }}
              />
              {/if}
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

            <!-- `relative` pelo mesmo motivo do `AttachmentPicker`: o campo de arquivo abaixo
                 é `sr-only`, que é `position: absolute`. Sem um ancestral posicionado, ele se
                 ancora num elemento lá em cima, e quando o seletor do sistema fecha o
                 navegador rola ESSE elemento para dentro da vista — a página pula sozinha. -->
            <div class="relative flex flex-col gap-1.5">
              <label class="text-ink-700 text-sm font-medium" for="screenshot">
                Print do erro (opcional)
              </label>
              <div class="flex items-center gap-2">
                <label
                  for="screenshot"
                  class="control-lg flex flex-1 cursor-pointer items-center gap-2 rounded-control border border-dashed border-border/80 bg-muted/20 text-xs text-muted-foreground transition-colors hover:bg-muted/40"
                >
                  <PaperclipIcon class="size-3.5 shrink-0" aria-hidden="true" />
                  <span class="truncate">{data.screenshotName ?? 'Escolher um arquivo de imagem'}</span>
                </label>
                {#if data.screenshotName}
                  <button
                    type="button"
                    onclick={removeFile}
                    aria-label="Remover o print anexado"
                    class="text-muted-foreground hover:text-destructive hover:bg-destructive/10 control-icon-lg flex shrink-0 items-center justify-center rounded-control border border-border/80 transition-colors"
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
                accept={screenshotAccept()}
                disabled={formState.isSubmitting}
                onchange={handleFile}
                class="sr-only"
              />
              {#if formState.screenshotError}
                <p class="text-destructive text-xs" role="alert">{formState.screenshotError}</p>
              {/if}
            </div>

            <div class="flex flex-col gap-1.5">
              <span class="text-ink-700 text-sm font-medium">Outros arquivos (opcional)</span>
              <!-- O print continua sendo um campo só, de imagem: ele nasceu antes e é o que a
                   maioria manda. Aqui entra o resto — a nota da peça, a planilha, o vídeo do
                   defeito que não dá para descrever por escrito. -->
              <AttachmentPicker
                data={{ files: data.attachments }}
                state={{ isDisabled: formState.isSubmitting, error: formState.attachmentError }}
                actions={{
                  onChange: actions.onAttachmentsChange,
                  onError: actions.onAttachmentError,
                }}
              />
            </div>
          </TimelineStep>
        {:else}
          <TimelineStep data={{ title: 'Como te avisamos', icon: MessageCircle }} ui={{ isLast: true, tone: 'success' }}>
            <label
              class="flex cursor-pointer items-start gap-2.5 rounded-box border border-border/80 bg-muted/20 px-3.5 py-3 text-sm text-ink-700 transition-colors hover:bg-muted/40"
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
