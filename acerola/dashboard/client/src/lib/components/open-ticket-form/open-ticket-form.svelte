<script lang="ts" module>
  import {
    TICKET_DEPARTMENTS,
    TICKET_DEPARTMENT_LABELS,
    TICKET_PROBLEM_TYPE_LABELS,
    TICKET_PROBLEM_TYPES,
  } from '@template/shared/domain/ticket-catalog.util';
  import {
    TICKET_PRIORITIES,
    TICKET_PRIORITY_LABELS,
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
   * O formulário PÚBLICO de abrir chamado.
   *
   * Função pura de props: o valor e o erro de cada campo chegam prontos (`FormFieldState`), e
   * por isso a tela abre no Storybook preenchida, com erro, enviando e já com o protocolo —
   * sem servidor e sem biblioteca de formulário no meio.
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
  }));
</script>

<script lang="ts">
  import { DESCRIPTION_MAX_LENGTH } from '@template/shared/schemas/ticket.schema';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import SelectField from '$lib/components/select-field/select-field.svelte';
  import SubmitButton from '$lib/components/submit-button/submit-button.svelte';
  import TextAreaField from '$lib/components/text-area-field/text-area-field.svelte';
  import TextField from '$lib/components/text-field/text-field.svelte';

  let { data, state, actions }: OpenTicketFormProps = $props();

  const fields = $derived(data.fields);

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }

  function handleFile(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    actions.onScreenshotChange(input.files?.[0] ?? null);
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
    <h2 class="text-ink-900 mb-4 text-lg font-bold">Abrir chamado</h2>

    <form novalidate class="flex flex-col gap-4" onsubmit={handleSubmit}>
      <div class="grid gap-4 sm:grid-cols-2">
        <TextField
          data={{
            label: 'Seu nome',
            name: 'requesterName',
            value: fields.requesterName.value,
            placeholder: 'Digite seu nome',
          }}
          state={{ error: fields.requesterName.error, isDisabled: state.isSubmitting }}
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
          }}
          state={{ error: fields.contactPhone.error, isDisabled: state.isSubmitting }}
          actions={{
            onChange: (value: string) => actions.onChange('contactPhone', value),
            onBlur: () => actions.onBlur('contactPhone'),
          }}
        />

        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Departamento</span>
          <SelectField
            data={{ value: fields.department.value, options: DEPARTMENT_OPTIONS }}
            ui={{ ariaLabel: 'Departamento' }}
            state={{ isDisabled: state.isSubmitting }}
            actions={{ onChange: (value: string) => actions.onChange('department', value) }}
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Tipo de problema</span>
          <SelectField
            data={{ value: fields.problemType.value, options: PROBLEM_TYPE_OPTIONS }}
            ui={{ ariaLabel: 'Tipo de problema' }}
            state={{ isDisabled: state.isSubmitting }}
            actions={{ onChange: (value: string) => actions.onChange('problemType', value) }}
          />
        </div>

        <TextField
          data={{
            label: 'Número do AnyDesk (opcional)',
            name: 'anydeskId',
            value: fields.anydeskId.value,
            placeholder: 'Ex: 123 456 789',
          }}
          state={{ error: fields.anydeskId.error, isDisabled: state.isSubmitting }}
          actions={{
            onChange: (value: string) => actions.onChange('anydeskId', value),
            onBlur: () => actions.onBlur('anydeskId'),
          }}
        />

        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Urgência</span>
          <SelectField
            data={{ value: fields.priority.value, options: PRIORITY_OPTIONS }}
            ui={{ ariaLabel: 'Urgência' }}
            state={{ isDisabled: state.isSubmitting }}
            actions={{ onChange: (value: string) => actions.onChange('priority', value) }}
          />
        </div>
      </div>

      <TextAreaField
        data={{
          label: 'Descrição do problema',
          name: 'description',
          value: fields.description.value,
          placeholder: 'Descreva o problema com o máximo de detalhes possível',
          maxLength: DESCRIPTION_MAX_LENGTH,
        }}
        ui={{ rows: 5 }}
        state={{ error: fields.description.error, isDisabled: state.isSubmitting }}
        actions={{
          onChange: (value: string) => actions.onChange('description', value),
          onBlur: () => actions.onBlur('description'),
        }}
      />

      <div class="flex flex-col gap-1.5">
        <label class="text-ink-700 text-sm font-medium" for="screenshot">
          Print do erro (opcional)
        </label>
        <input
          id="screenshot"
          name="screenshot"
          type="file"
          accept="image/*"
          disabled={state.isSubmitting}
          onchange={handleFile}
          class="border-input bg-card text-ink-700 file:text-primary rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-transparent file:font-semibold"
        />
        {#if data.screenshotName}
          <span class="text-ink-500 text-xs">Selecionado: {data.screenshotName}</span>
        {/if}
      </div>

      <label class="text-ink-700 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          class="mt-0.5"
          checked={data.notifyWhatsapp}
          disabled={state.isSubmitting}
          onchange={(event) => actions.onNotifyChange(event.currentTarget.checked)}
        />
        Quero receber o protocolo e avisos deste chamado no WhatsApp
      </label>

      {#if state.error}
        <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
      {/if}

      <SubmitButton
        data={{ label: 'Abrir chamado', loadingLabel: 'Abrindo…' }}
        state={{ isLoading: state.isSubmitting }}
      />
    </form>
  {/if}
</section>
