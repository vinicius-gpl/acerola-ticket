<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  import TicketDataForm, { type AcerolaTicketDataFormProps } from './acerola-ticket-data-form.svelte';

  /* Dado INVENTADO: nenhum nome ou telefone daqui existe. */
  const ticket: Ticket = {
    id: 28,
    protocol: 'CH-0028',
    status: 'waiting_third_party',
    priority: 'high',
    requesterName: 'Priscila Azevedo',
    area: 'infra',
    department: 'fiscal',
    problemType: 'other',
    participantAreas: [],
    computerId: 3,
    computerName: 'FISCAL-02',
    anydeskId: null,
    contactPhone: '62999990028',
    notifyWhatsapp: true,
    description: 'O computador não liga. Nem a luz da frente acende.',
    screenshotUrl: null,
    assignee: 'Suporte TI',
    solution: null,
    createdAt: '2026-09-23T11:00:00.000Z',
    startedAt: '2026-09-23T11:40:00.000Z',
    resolvedAt: null,
    updatedAt: '2026-09-23T13:30:00.000Z',
    updatedBy: 'suporte@azuos.local',
  };

  const machines = [
    { value: '1', label: 'Recepção — balcão (RECEPCAO-01)' },
    { value: '2', label: 'FINANCEIRO-01' },
    { value: '3', label: 'FISCAL-02' },
  ];

  const data: AcerolaTicketDataFormProps['data'] = {
    ticket,
    fields: {
      priority: { value: 'high', error: null },
      area: { value: 'infra', error: null },
      problemType: { value: 'other', error: null },
      computerId: { value: '3', error: null },
      assignee: { value: 'Suporte TI', error: null },
    },
    machines,
    availableParticipantAreas: [
      { value: 'sistema', label: 'Sistema' },
      { value: 'manutencao', label: 'Manutenção' },
    ],
    chosenParticipantArea: '',
  };

  const actions: AcerolaTicketDataFormProps['actions'] = {
    onChange: () => {},
    onBlur: () => {},
    onSubmit: () => {},
    onChosenParticipantAreaChange: () => {},
    onAddParticipantArea: () => {},
    onRemoveParticipantArea: () => {},
  };

  const { Story } = defineMeta({
    title: 'Features/Tickets/AcerolaTicketDataForm',
    component: TicketDataForm,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data, actions }} />

<!-- Chamado recém-aberto: sem máquina e sem responsável ainda. -->
<Story
  name="FreshTicket"
  args={{
    data: {
      ...data,
      ticket: { ...ticket, computerId: null, computerName: null, assignee: null },
      fields: {
        ...data.fields,
        computerId: { value: '', error: null },
        assignee: { value: '', error: null },
      },
    },
    actions,
  }}
/>

<!-- Com áreas participantes, e uma escolhida para adicionar. -->
<Story
  name="WithParticipantAreas"
  args={{
    data: {
      ...data,
      ticket: { ...ticket, participantAreas: ['manutencao'] },
      availableParticipantAreas: [{ value: 'sistema', label: 'Sistema' }],
      chosenParticipantArea: 'sistema',
    },
    actions,
  }}
/>

<Story name="Saving" args={{ data, state: { isSubmitting: true }, actions }} />

<!-- Acabou de salvar: a confirmação aparece ao lado do botão. -->
<Story name="Saved" args={{ data, state: { isSaved: true }, actions }} />

<!-- A recusa do servidor: só quem gerencia a área reclassifica. -->
<Story
  name="RefusedByServer"
  args={{
    data,
    state: { error: 'Só quem gerencia alguma área deste chamado pode reclassificar ele.' },
    actions,
  }}
/>

<Story
  name="WithErrors"
  args={{
    data: {
      ...data,
      fields: {
        ...data.fields,
        assignee: {
          value: 'x'.repeat(40),
          error: 'O nome do responsável pode ter até 200 caracteres',
        },
      },
    },
    state: { areaError: 'Não consegui adicionar a área.' },
    actions,
  }}
/>

<!-- Caso limite: na coluna lateral estreita da ficha, na largura de um celular. -->
<Story name="OnPhone">
  <div class="w-[360px]">
    <TicketDataForm
      data={{ ...data, ticket: { ...ticket, participantAreas: ['sistema', 'manutencao'] }, availableParticipantAreas: [] }}
      {actions}
    />
  </div>
</Story>
