<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import {
    ticketHistoryEffect,
    ticketHistoryEffectLabel,
    ticketHistoryTone,
    ticketHistoryTypeGroups,
    ticketHistoryTypeLabel,
    type ManualTicketHistoryType,
  } from '@template/shared/domain/ticket-history.util';
  import { type TicketStatus } from '@template/shared/domain/ticket-status.util';

  import TicketHistoryForm, {
    type AcerolaTicketHistoryFormProps,
  } from './acerola-ticket-history-form.svelte';

  const actions: AcerolaTicketHistoryFormProps['actions'] = {
    onTypeChange: () => {},
    onChange: () => {},
    onBlur: () => {},
    onVisibilityChange: () => {},
    onChosenFilesChange: () => {},
    onAttachmentError: () => {},
    onSubmit: () => {},
  };

  /* As opções saem do DOMÍNIO, como na tela de verdade: o que o chamado naquele estágio
     realmente oferece, já nos dois grupos. */
  function groupsFor(status: TicketStatus): AcerolaTicketHistoryFormProps['data']['groups'] {
    const groups = ticketHistoryTypeGroups(status);
    const toOption = (type: ManualTicketHistoryType) => ({
      value: type,
      label: ticketHistoryTypeLabel(type),
      tone: ticketHistoryTone(type),
    });

    return { continuing: groups.continuing.map(toOption), closing: groups.closing.map(toOption) };
  }

  /* As opções e o aviso saem do DOMÍNIO, como na tela de verdade: a história mostra o que o
     chamado naquele estágio realmente oferece. */
  function dataFor(
    status: TicketStatus,
    type: ManualTicketHistoryType,
    over: Partial<AcerolaTicketHistoryFormProps['data']> = {},
  ): AcerolaTicketHistoryFormProps['data'] {
    return {
      type,
      groups: groupsFor(status),
      effect: ticketHistoryEffect(type),
      effectLabel: ticketHistoryEffectLabel(type),
      fields: {
        description: { value: '', error: null },
        minutesSpent: { value: '', error: null },
      },
      isVisibleToRequester: true,
      chosenFiles: [],
      ...over,
    };
  }

  const { Story } = defineMeta({
    title: 'Features/Tickets/AcerolaTicketHistoryForm',
    component: TicketHistoryForm,
    parameters: { layout: 'padded' },
  });
</script>

<!-- Chamado em atendimento, com o tipo mais comum escolhido: só acrescenta à linha do tempo. -->
<Story name="Default" args={{ data: dataFor('in_progress', 'note'), actions }} />

<!-- Chamado recém-aberto: "Início do atendimento" aparece — e some depois que alguém assume. -->
<Story name="FreshTicket" args={{ data: dataFor('open', 'start'), actions }} />

<!-- Um tipo que MUDA o estágio sem encerrar. -->
<Story
  name="MovesTheStage"
  args={{
    data: dataFor('in_progress', 'waiting_third_party', {
      fields: {
        description: { value: 'Fonte nova pedida ao fornecedor.', error: null },
        minutesSpent: { value: '20', error: null },
      },
    }),
    actions,
  }}
/>

<!-- Um tipo que ENCERRA: o aviso muda de cor, o rótulo do campo e o texto do botão também. -->
<Story
  name="ClosesTheTicket"
  args={{
    data: dataFor('in_progress', 'closure_with_caveats', {
      fields: {
        description: {
          value: 'Troquei o rolete. A bandeja 2 segue com defeito: usar só a bandeja 1.',
          error: null,
        },
        minutesSpent: { value: '70', error: null },
      },
    }),
    actions,
  }}
/>

<!-- Chamado aguardando: a "Retomada" só existe aqui. -->
<Story name="WaitingTicket" args={{ data: dataFor('waiting_requester', 'resume'), actions }} />

<!-- Chamado encerrado: só cabe a reabertura, e não existe grupo de encerrar. -->
<Story name="ClosedTicket" args={{ data: dataFor('resolved', 'reopening'), actions }} />

<!-- Anotação interna: quem abriu o chamado não vê. -->
<Story
  name="InternalNote"
  args={{ data: dataFor('in_progress', 'note', { isVisibleToRequester: false }), actions }}
/>

<Story
  name="WithErrors"
  args={{
    data: dataFor('in_progress', 'resolution', {
      fields: {
        description: { value: '', error: 'Descreva o que aconteceu' },
        minutesSpent: { value: '99999', error: 'Esse tempo é maior do que um mês inteiro' },
      },
    }),
    actions,
  }}
/>

<Story
  name="Submitting"
  args={{
    data: dataFor('in_progress', 'resolution', {
      fields: {
        description: { value: 'Troquei o cabo de rede.', error: null },
        minutesSpent: { value: '15', error: null },
      },
    }),
    state: { isSubmitting: true },
    actions,
  }}
/>

<!-- A recusa do servidor: gestor tentando encerrar. O que foi digitado fica. -->
<Story
  name="RefusedByServer"
  args={{
    data: dataFor('in_progress', 'resolution', {
      fields: {
        description: { value: 'Troquei o cabo de rede.', error: null },
        minutesSpent: { value: '', error: null },
      },
    }),
    state: {
      error: 'Só quem administra alguma área deste chamado pode encerrá-lo ou reabri-lo.',
    },
    actions,
  }}
/>

<!-- Caso limite: todas as opções na largura de um celular. -->
<Story name="OnPhone">
  <div class="w-[360px]">
    <TicketHistoryForm data={dataFor('open', 'note')} {actions} />
  </div>
</Story>
