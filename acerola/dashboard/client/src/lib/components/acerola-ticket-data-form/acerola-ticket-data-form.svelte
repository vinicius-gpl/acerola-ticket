<script lang="ts" module>
  import {
    ticketAreaLabel,
    ticketAreaOptions,
    ticketProblemTypeOptionsForArea,
    type TicketArea,
  } from '@template/shared/domain/ticket-catalog.util';
  import {
    TICKET_PRIORITIES,
    TICKET_PRIORITY_LABELS,
    ticketPriorityTone,
  } from '@template/shared/domain/ticket-status.util';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';
  import { type FormFieldState } from '$lib/types/form-field.type';

  export type TicketDataField = 'priority' | 'area' | 'problemType' | 'computerId' | 'projectId';

  /**
   * Os DADOS do chamado que o TI corrige: urgência, área, tipo, máquina e sistema.
   *
   * O RESPONSÁVEL não está aqui, de propósito: ele não se troca à mão. Quem assume o chamado
   * vira responsável ao lançar o primeiro histórico, e a ficha o mostra só para leitura.
   *
   * Função pura de props: o valor e o erro de cada campo chegam prontos (`FormFieldState`).
   *
   * O ESTÁGIO não está neste formulário, e não é esquecimento: ele só muda lançando um
   * histórico. Aqui se corrige o cadastro — e cada correção fica, sozinha, na linha do tempo.
   */
  export type AcerolaTicketDataFormProps = {
    data: {
      ticket: Ticket;
      fields: Record<TicketDataField, FormFieldState>;
      /** As máquinas do inventário, para vincular o chamado a uma delas. */
      machines: { value: string; label: string }[];
      /** Os projetos/sistemas para vincular o chamado. */
      projects?: { value: string; label: string }[];
      /** As áreas que ainda podem entrar como participante — todas, menos as que já são. */
      availableParticipantAreas: { value: TicketArea; label: string }[];
    };
    state?: {
      isSubmitting?: boolean;
      isSaved?: boolean;
      error?: string | null;
      isAddingArea?: boolean;
      removingAreaArea?: TicketArea | null;
      areaError?: string | null;
    };
    actions: {
      onChange: (field: TicketDataField, value: string) => void;
      onBlur: (field: TicketDataField) => void;
      onSubmit: () => void;
      onAddParticipantArea: (area: TicketArea) => void;
      onRemoveParticipantArea: (area: TicketArea) => void;
    };
  };

  const AREA_OPTIONS = ticketAreaOptions();

  const PRIORITY_OPTIONS = TICKET_PRIORITIES.map((priority) => ({
    value: priority,
    label: TICKET_PRIORITY_LABELS[priority],
    tone: ticketPriorityTone(priority),
  }));
</script>

<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import XIcon from '@lucide/svelte/icons/x';

  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import FilterField from '$lib/components/acerola-filter-field/acerola-filter-field.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import SelectField from '$lib/components/acerola-select-field/acerola-select-field.svelte';
  import SubmitButton from '$lib/components/acerola-submit-button/acerola-submit-button.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, state: formState, actions }: AcerolaTicketDataFormProps = $props();

  const fields = $derived(data.fields);

  /* "Nenhuma" precisa ser uma opção de verdade: é assim que se desfaz um vínculo errado. O
     valor vazio é o que o view-model traduz de volta para nulo ao salvar. */
  const machineOptions = $derived([{ value: '', label: 'Nenhuma' }, ...data.machines]);
  const projectOptions = $derived([{ value: '', label: 'Nenhum' }, ...(data.projects ?? [])]);

  /* As opções de tipo de problema dependem da ÁREA escolhida — Manutenção não tem
     "ar-condicionado" na lista de Infra, nem Infra tem "rede caiu" na de Manutenção. */
  const problemTypeOptions = $derived(
    ticketProblemTypeOptionsForArea(fields.area.value as TicketArea),
  );

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }

  function handleAreaChange(value: string): void {
    actions.onChange('area', value);
    /* Trocar de área pode deixar o tipo de problema atual fora da lista nova —
       "ar-condicionado" não existe em Infra. O primeiro tipo da área nova é sempre um valor
       válido, e evita mandar um tipo órfão. */
    const firstOfArea = ticketProblemTypeOptionsForArea(value as TicketArea)[0];
    if (firstOfArea) actions.onChange('problemType', firstOfArea.value);
  }
</script>

<form novalidate class="flex flex-col gap-4" onsubmit={handleSubmit}>
  <FilterField data={{ label: 'Urgência' }}>
    <OptionPicker
      data={{ value: fields.priority.value, options: PRIORITY_OPTIONS }}
      ui={{ ariaLabel: 'Urgência', fullWidth: true }}
      state={{ isDisabled: formState?.isSubmitting }}
      actions={{ onChange: (value: string) => actions.onChange('priority', value) }}
    />
  </FilterField>

  <!-- A área (#13): quem abre escolhe pelo que parece; quem atende descobre que era de outra.
       Trocar aqui PODE ser recusado pelo servidor — só quem gerencia alguma área do chamado
       reclassifica (ver `TicketsService.update`). -->
  <FilterField data={{ label: 'Área' }}>
    <OptionPicker
      data={{ value: fields.area.value, options: AREA_OPTIONS }}
      ui={{ ariaLabel: 'Área', fullWidth: true }}
      state={{ isDisabled: formState?.isSubmitting }}
      actions={{ onChange: handleAreaChange }}
    />
  </FilterField>

  <!-- Quem abre o chamado escolhe o tipo pelo que parece; quem atende descobre o que era. Sem
       esta correção, o mapa de "o que mais dá problema" soma o palpite de quem pediu socorro,
       e não o diagnóstico. -->
  <FilterField data={{ label: 'Tipo do problema' }}>
    <SelectField
      data={{ value: fields.problemType.value, options: problemTypeOptions }}
      ui={{ ariaLabel: 'Tipo do problema' }}
      state={{ isDisabled: formState?.isSubmitting }}
      actions={{ onChange: (value: string) => actions.onChange('problemType', value) }}
    />
  </FilterField>

  <!-- A máquina é preenchida AQUI, e não no formulário público: quem pede socorro não sabe por
       qual nome o sistema conhece o computador dele. É este vínculo que faz a ficha da máquina
       saber quantos problemas ela já deu. O `OptionPicker` vira busca sozinho quando passa de
       poucas opções — achar "a da recepção" entre cinquenta é digitar "recep". -->
  <FilterField data={{ label: 'Máquina' }}>
    <OptionPicker
      data={{ value: fields.computerId.value, options: machineOptions }}
      ui={{ ariaLabel: 'Máquina', placeholder: 'Nenhuma', fullWidth: true }}
      state={{ isDisabled: formState?.isSubmitting }}
      actions={{ onChange: (value: string) => actions.onChange('computerId', value) }}
    />
  </FilterField>

  {#if fields.projectId && (fields.area.value === 'sistema' || (data.projects && data.projects.length > 0))}
    <FilterField data={{ label: 'Sistema / Software' }}>
      <OptionPicker
        data={{ value: fields.projectId.value, options: projectOptions }}
        ui={{ ariaLabel: 'Sistema / Software', placeholder: 'Nenhum', fullWidth: true }}
        state={{ isDisabled: formState?.isSubmitting }}
        actions={{ onChange: (value: string) => actions.onChange('projectId', value) }}
      />
    </FilterField>
  {/if}

  {#if formState?.error}
    <ErrorState data={{ message: formState.error }} ui={{ variant: 'inline' }} />
  {/if}

  <div class="flex items-center justify-end gap-3">
    {#if formState?.isSaved}
      <!-- `role="status"`: quem usa leitor de tela também fica sabendo que salvou. -->
      <span class="text-success text-xs font-medium" role="status">Dados salvos.</span>
    {/if}
    <SubmitButton
      data={{ label: 'Salvar dados', loadingLabel: 'Salvando…' }}
      ui={{ className: 'sm:w-auto' }}
      state={{ isLoading: formState?.isSubmitting }}
    />
  </div>

  <!-- ÁREAS PARTICIPANTES (#13) — além da área original, de cima. Ex.: um chamado de Infra que
       também precisa de Manutenção. Mudança própria, fora do envio do formulário: adiciona e
       remove na hora, sem esperar o resto ser salvo. -->
  <div class="border-border/70 flex flex-col gap-3 border-t pt-4">
    <div>
      <p class="text-ink-700 text-sm font-medium">Áreas participantes</p>
      <p class="text-muted-foreground text-xs">Outras áreas que também atendem este chamado.</p>
    </div>

    <!-- AS QUE JÁ PARTICIPAM: uma pastilha cheia cada, com o X dentro dela. -->
    {#if data.ticket.participantAreas.length === 0}
      <p class="text-muted-foreground/70 text-xs">Nenhuma área participante ainda.</p>
    {:else}
      <ul class="flex flex-wrap items-center gap-1.5">
        {#each data.ticket.participantAreas as area (area)}
          <li
            class={cn(
              'bg-primary/15 text-primary inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-xs font-semibold',
              formState?.removingAreaArea === area && 'opacity-60',
            )}
          >
            {ticketAreaLabel(area)}
            <button
              type="button"
              onclick={() => actions.onRemoveParticipantArea(area)}
              disabled={formState?.removingAreaArea === area}
              aria-label={`Remover ${ticketAreaLabel(area)} do chamado`}
              class="hover:bg-primary/20 flex size-5 cursor-pointer items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed"
            >
              <XIcon class="size-3" aria-hidden="true" />
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <!-- AS QUE PODEM ENTRAR: um botão tracejado cada, que adiciona com UM clique. Antes era
         escolher numa fileira e depois apertar "Adicionar" — dois gestos, e a fileira parecia
         um seletor do formulário de cima, que só vale ao salvar. O tracejado diz "ainda não
         está aqui"; a pastilha cheia, acima, diz "já está". -->
    {#if data.availableParticipantAreas.length > 0}
      <div class="flex flex-wrap items-center gap-1.5">
        {#each data.availableParticipantAreas as option (option.value)}
          <button
            type="button"
            onclick={() => actions.onAddParticipantArea(option.value)}
            disabled={formState?.isAddingArea}
            aria-label={`Adicionar ${option.label} ao chamado`}
            class={cn(
              'control-sm border-border text-muted-foreground inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed text-xs font-medium transition-colors',
              'hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            <PlusIcon class="size-3" aria-hidden="true" />
            {option.label}
          </button>
        {/each}
      </div>
    {/if}

    {#if formState?.areaError}
      <p class="text-destructive text-xs">{formState.areaError}</p>
    {/if}
  </div>
</form>
