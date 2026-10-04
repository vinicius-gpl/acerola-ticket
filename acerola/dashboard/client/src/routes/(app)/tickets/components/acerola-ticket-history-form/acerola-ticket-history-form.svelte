<script lang="ts" module>
  import {
    type ManualTicketHistoryType,
    type TicketHistoryEffect,
    type TicketHistoryTone,
  } from '@template/shared/domain/ticket-history.util';
  import { type FormFieldState } from '$lib/types/form-field.type';

  export type TicketHistoryTypeOption = {
    value: ManualTicketHistoryType;
    label: string;
    tone: TicketHistoryTone;
  };

  /**
   * LANÇAR UM HISTÓRICO na ordem de serviço.
   *
   * Função pura de props: quais tipos cabem, o que cada um faz e o texto do aviso chegam
   * prontos, e por isso o formulário abre no Storybook em qualquer estágio do chamado.
   *
   * A decisão de desenho que importa: os tipos vêm em DOIS GRUPOS com título — os que dão
   * andamento e os que encerram. E o que o tipo escolhido faz é dito três vezes, de três
   * jeitos: no grupo em que ele está, na frase embaixo e no texto do botão. Encerrar um
   * chamado por engano é o erro que este formulário existe para não deixar acontecer.
   */
  export type AcerolaTicketHistoryFormProps = {
    data: {
      type: ManualTicketHistoryType;
      groups: { continuing: TicketHistoryTypeOption[]; closing: TicketHistoryTypeOption[] };
      /** O que o tipo escolhido faz com o chamado. */
      effect: TicketHistoryEffect;
      /** A frase que diz isso. */
      effectLabel: string;
      fields: Record<'description' | 'minutesSpent', FormFieldState>;
      isVisibleToRequester: boolean;
      chosenFiles: File[];
    };
    state?: {
      isSubmitting?: boolean;
      error?: string | null;
      attachmentError?: string | null;
    };
    actions: {
      onTypeChange: (type: ManualTicketHistoryType) => void;
      onChange: (field: 'description' | 'minutesSpent', value: string) => void;
      onBlur: (field: 'description' | 'minutesSpent') => void;
      onVisibilityChange: (isVisible: boolean) => void;
      onChosenFilesChange: (files: File[]) => void;
      onAttachmentError: (message: string | null) => void;
      onSubmit: () => void;
    };
  };

  /** A bolinha de cada opção, na cor do tipo — a mesma que ele terá na linha do tempo. */
  const DOT_TONE_CLASSES: Record<TicketHistoryTone, string> = {
    neutral: 'bg-muted-foreground',
    info: 'bg-info',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-destructive',
    brand: 'bg-primary',
  };

  /** O aviso do que o histórico faz: encerrar chama a atenção; o resto só informa. */
  const EFFECT_CLASSES: Record<TicketHistoryEffect, string> = {
    closes: 'border-warning/40 bg-warning-soft text-foreground',
    moves: 'border-info/30 bg-info-soft text-foreground',
    keeps: 'border-border bg-muted/40 text-muted-foreground',
  };
</script>

<script lang="ts">
  import { HISTORY_DESCRIPTION_MAX_LENGTH } from '@template/shared/schemas/ticket-history.schema';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Lock from '@lucide/svelte/icons/lock';
  import StickyNote from '@lucide/svelte/icons/sticky-note';

  import AttachmentPicker from '$lib/components/acerola-attachment-picker/acerola-attachment-picker.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import SubmitButton from '$lib/components/acerola-submit-button/acerola-submit-button.svelte';
  import TextAreaField from '$lib/components/acerola-text-area-field/acerola-text-area-field.svelte';
  import TextField from '$lib/components/acerola-text-field/acerola-text-field.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, state: formState, actions }: AcerolaTicketHistoryFormProps = $props();

  const isClosing = $derived(data.effect === 'closes');

  const EFFECT_ICONS = { closes: Lock, moves: ArrowRight, keeps: StickyNote } as const;
  const EffectIcon = $derived(EFFECT_ICONS[data.effect]);

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

{#snippet typeGroup(legend: string, options: TicketHistoryTypeOption[], isClosingGroup: boolean)}
  <fieldset class="flex min-w-0 flex-col gap-2" disabled={formState?.isSubmitting}>
    <legend class="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
      {#if isClosingGroup}
        <Lock class="size-3" aria-hidden="true" />
      {/if}
      {legend}
    </legend>

    <div class="flex flex-wrap gap-2">
      {#each options as option (option.value)}
        <!-- Rádio de verdade por baixo da pastilha: o teclado e o leitor de tela recebem um
             grupo de opções, e não uma fileira de botões soltos. -->
        <label
          class={cn(
            'control-lg rounded-control border-border bg-card text-foreground inline-flex cursor-pointer items-center gap-2 border text-sm font-medium transition-colors',
            'hover:bg-muted/60 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2',
            'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60',
            data.type === option.value &&
              (isClosingGroup
                ? 'border-warning bg-warning-soft'
                : 'border-primary bg-primary-soft'),
          )}
        >
          <input
            type="radio"
            name="history-type"
            class="sr-only"
            value={option.value}
            checked={data.type === option.value}
            onchange={() => actions.onTypeChange(option.value)}
          />
          <span class={cn('size-2 shrink-0 rounded-full', DOT_TONE_CLASSES[option.tone])} aria-hidden="true"></span>
          {option.label}
        </label>
      {/each}
    </div>
  </fieldset>
{/snippet}

<form novalidate class="flex flex-col gap-5" onsubmit={handleSubmit}>
  <div class="flex flex-col gap-4" role="radiogroup" aria-label="Tipo de histórico">
    {#if data.groups.continuing.length > 0}
      {@render typeGroup('Dar andamento', data.groups.continuing, false)}
    {/if}

    {#if data.groups.closing.length > 0}
      <div class="border-border/70 border-t pt-4">
        {@render typeGroup('Encerrar o chamado', data.groups.closing, true)}
      </div>
    {/if}
  </div>

  <!-- O QUE ESTE HISTÓRICO FAZ, antes de a pessoa confirmar. `aria-live`: quem usa leitor de
       tela ouve a frase mudar quando troca de tipo — é a mesma informação que a cor dá. -->
  <p
    class={cn('rounded-box flex items-start gap-2 border px-3.5 py-3 text-sm', EFFECT_CLASSES[data.effect])}
    aria-live="polite"
  >
    <EffectIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <span class={cn(isClosing && 'font-medium')}>{data.effectLabel}</span>
  </p>

  <TextAreaField
    data={{
      label: isClosing ? 'O que foi feito' : 'O que aconteceu',
      name: 'description',
      value: data.fields.description.value,
      placeholder: isClosing
        ? 'Descreva a solução — ou o motivo, se for um cancelamento'
        : 'Descreva este passo do atendimento',
      maxLength: HISTORY_DESCRIPTION_MAX_LENGTH,
      isRequired: true,
    }}
    state={{ error: data.fields.description.error, isDisabled: formState?.isSubmitting }}
    actions={{
      onChange: (value: string) => actions.onChange('description', value),
      onBlur: () => actions.onBlur('description'),
    }}
  />

  <!-- As duas colunas têm a MESMA forma — um rótulo e, embaixo, um controle de 40px — para o
       campo e a caixa de marcar ficarem na mesma linha. A explicação da caixa vai embaixo dela,
       no lugar onde o campo ao lado mostra o erro. -->
  <div class="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-start">
    <TextField
      data={{
        label: 'Tempo gasto (minutos)',
        name: 'minutesSpent',
        value: data.fields.minutesSpent.value,
        placeholder: 'Opcional — ex: 30',
      }}
      ui={{ inputMode: 'numeric' }}
      state={{ error: data.fields.minutesSpent.error, isDisabled: formState?.isSubmitting }}
      actions={{
        onChange: (value: string) => actions.onChange('minutesSpent', value),
        onBlur: () => actions.onBlur('minutesSpent'),
      }}
    />

    <div class="flex min-w-0 flex-col gap-1.5">
      <span class="text-ink-700 text-sm font-medium" aria-hidden="true">Visibilidade</span>
      <label
        class={cn(
          'control-lg rounded-control border-input bg-card text-foreground flex cursor-pointer items-center gap-2.5 border text-sm transition-colors',
          'hover:bg-muted/40 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60',
        )}
      >
        <input
          type="checkbox"
          class="shrink-0"
          checked={data.isVisibleToRequester}
          disabled={formState?.isSubmitting}
          aria-describedby="history-visibility-hint"
          onchange={(event) => actions.onVisibilityChange(event.currentTarget.checked)}
        />
        <span class="truncate">Quem abriu o chamado pode ver este histórico</span>
      </label>
      <p id="history-visibility-hint" class="text-muted-foreground text-xs">
        {data.isVisibleToRequester
          ? 'Desmarque para uma anotação interna do time.'
          : 'Anotação interna: só o time vê.'}
      </p>
    </div>
  </div>

  <div class="flex flex-col gap-2">
    <p class="text-muted-foreground text-xs font-medium">
      Arquivos deste histórico
      <span class="text-muted-foreground/70 font-normal">— entram junto, ao registrar</span>
    </p>
    <AttachmentPicker
      data={{ files: data.chosenFiles }}
      state={{ isDisabled: formState?.isSubmitting, error: formState?.attachmentError }}
      actions={{ onChange: actions.onChosenFilesChange, onError: actions.onAttachmentError }}
    />
  </div>

  {#if formState?.error}
    <ErrorState data={{ message: formState.error }} ui={{ variant: 'inline' }} />
  {/if}

  <div class="flex justify-end">
    <SubmitButton
      data={{
        label: isClosing ? 'Encerrar chamado' : 'Registrar histórico',
        loadingLabel: 'Registrando…',
      }}
      ui={{ className: 'sm:w-auto' }}
      state={{ isLoading: formState?.isSubmitting }}
    />
  </div>
</form>
