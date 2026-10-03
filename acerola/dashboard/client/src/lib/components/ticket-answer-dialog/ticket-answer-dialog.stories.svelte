<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { ticketAreaOptions } from '@template/shared/domain/ticket-catalog.util';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  import { type FormFieldState } from '$lib/types/form-field.type';
  import TicketAnswerDialog, { type TicketAnswerField } from './ticket-answer-dialog.svelte';

  const field = (value: string, error: string | null = null): FormFieldState => ({ value, error });

  const ticket: Ticket = {
    id: 7,
    protocol: 'CH-0007',
    status: 'open',
    priority: 'high',
    requesterName: 'Bia Costa',
    area: 'infra',
    department: 'financeiro',
    problemType: 'printer',
    participantAreas: [],
    anydeskId: '111 222 333',
    contactPhone: '62999990001',
    notifyWhatsapp: true,
    description: 'A impressora da sala não puxa papel e trava no meio da folha.',
    screenshotUrl: null,
    computerId: null,
    computerName: null,
    assignee: null,
    solution: null,
    createdAt: '2026-09-15T12:10:00.000Z',
    startedAt: null,
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
  };

  const freshFields: Record<TicketAnswerField, FormFieldState> = {
    status: field('open'),
    priority: field('high'),
    area: field('infra'),
    problemType: field('printer'),
    computerId: field(''),
    assignee: field(''),
    solution: field(''),
  };

  const answeredFields: Record<TicketAnswerField, FormFieldState> = {
    status: field('resolved'),
    priority: field('high'),
    area: field('infra'),
    problemType: field('printer'),
    computerId: field(''),
    assignee: field('Suporte TI'),
    solution: field('Retirei uma folha presa no rolete e limpei o tracionador.'),
  };

  /** As três áreas, menos Infra — é o que sobra para somar como participante no caso comum. */
  const availableParticipantAreas = ticketAreaOptions().filter((option) => option.value !== 'infra');

  const actions = {
    onChange: () => {},
    onBlur: () => {},
    onSubmit: () => {},
    onClose: () => {},
    onChosenFilesChange: () => {},
    onAttachmentError: () => {},
    onAttach: () => {},
    onRemoveAttachment: () => {},
    onChosenParticipantAreaChange: () => {},
    onAddParticipantArea: () => {},
    onRemoveParticipantArea: () => {},
  };

  const { Story } = defineMeta({
    title: 'Components/TicketAnswerDialog',
    component: TicketAnswerDialog,
  });
</script>

<Story
  name="Default"
  args={{
    data: { ticket, fields: freshFields, whatsAppLink: null, machines: [], attachments: [], chosenFiles: [], availableParticipantAreas, chosenParticipantArea: '' },
    state: { isOpen: true },
    actions,
  }}
/>

<Story
  name="Answered"
  args={{
    data: { ticket, fields: answeredFields, whatsAppLink: null, machines: [], attachments: [], chosenFiles: [], availableParticipantAreas, chosenParticipantArea: '' },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- O botão de aviso só existe quando a pessoa PEDIU para ser avisada. -->
<Story
  name="WithWhatsAppNotice"
  args={{
    data: {
      ticket,
      fields: answeredFields,
      whatsAppLink: 'https://wa.me/5562999990001?text=Seu%20chamado',
      machines: [],
      attachments: [],
      chosenFiles: [],
      availableParticipantAreas,
      chosenParticipantArea: '',
    },
    state: { isOpen: true },
    actions,
  }}
/>

<Story
  name="WithScreenshot"
  args={{
    data: {
      ticket: { ...ticket, screenshotUrl: 'https://example.invalid/print.png' },
      fields: freshFields,
      whatsAppLink: null,
      machines: [],
      attachments: [],
      chosenFiles: [],
      availableParticipantAreas,
      chosenParticipantArea: '',
    },
    state: { isOpen: true },
    actions,
  }}
/>

<Story
  name="Submitting"
  args={{
    data: { ticket, fields: answeredFields, whatsAppLink: null, machines: [], attachments: [], chosenFiles: [], availableParticipantAreas, chosenParticipantArea: '' },
    state: { isOpen: true, isSubmitting: true },
    actions,
  }}
/>

<!-- A recusa do servidor aparece DENTRO do modal, e ele continua aberto. -->
<Story
  name="ServerRefused"
  args={{
    data: { ticket, fields: answeredFields, whatsAppLink: null, machines: [], attachments: [], chosenFiles: [], availableParticipantAreas, chosenParticipantArea: '' },
    state: { isOpen: true, error: 'O banco recusou o valor enviado.' },
    actions,
  }}
/>

<!-- #13: chamado de Infra que também ganhou Manutenção como área participante. -->
<Story
  name="WithParticipantArea"
  args={{
    data: {
      ticket: { ...ticket, participantAreas: ['manutencao'] },
      fields: freshFields,
      whatsAppLink: null,
      machines: [],
      attachments: [],
      chosenFiles: [],
      availableParticipantAreas: ticketAreaOptions().filter(
        (option) => option.value !== 'infra' && option.value !== 'manutencao',
      ),
      chosenParticipantArea: '',
    },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Somando uma área participante: o botão "Somar" trava enquanto grava. -->
<Story
  name="AddingParticipantArea"
  args={{
    data: {
      ticket,
      fields: freshFields,
      whatsAppLink: null,
      machines: [],
      attachments: [],
      chosenFiles: [],
      availableParticipantAreas,
      chosenParticipantArea: 'manutencao',
    },
    state: { isOpen: true, isAddingArea: true },
    actions,
  }}
/>

<!-- Caso limite: chamado sem AnyDesk e com descrição longa. -->
<Story
  name="LongDescriptionWithoutAnydesk"
  args={{
    data: {
      ticket: {
        ...ticket,
        anydeskId: null,
        description:
          'Bom dia. Desde a atualização de ontem o computador liga, mostra a tela de ' +
          'boas-vindas, fica alguns minutos carregando e só então abre a área de trabalho. ' +
          'Quando abre, os ícones demoram para aparecer e o antivírus reclama de um arquivo.',
      },
      fields: freshFields,
      whatsAppLink: null,
      machines: [],
      attachments: [],
      chosenFiles: [],
      availableParticipantAreas,
      chosenParticipantArea: '',
    },
    state: { isOpen: true },
    actions,
  }}
/>
