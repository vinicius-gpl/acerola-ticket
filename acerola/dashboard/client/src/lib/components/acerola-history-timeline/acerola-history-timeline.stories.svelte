<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import HistoryTimeline, { type HistoryTimelineEntry } from './acerola-history-timeline.svelte';

  /* Dado INVENTADO: nenhum nome, telefone ou arquivo daqui existe. */
  const base: HistoryTimelineEntry = {
    id: 1,
    type: 'opening',
    description: 'Chamado aberto.',
    statusAfter: 'open',
    authorName: 'Quitéria Sampaio',
    createdAt: '2026-09-17T11:00:00.000Z',
    attachments: [],
    minutesSpent: null,
    isVisibleToRequester: true,
  };

  const fullStory: HistoryTimelineEntry[] = [
    base,
    {
      ...base,
      id: 2,
      type: 'start',
      description: 'Assumi o chamado. O rolete de tração está gasto e a bandeja 2 não trava.',
      statusAfter: 'in_progress',
      authorName: 'Suporte TI',
      createdAt: '2026-09-17T11:30:00.000Z',
      minutesSpent: 40,
    },
    {
      ...base,
      id: 3,
      type: 'note',
      description: 'Cotei o rolete com dois fornecedores. O segundo entrega em três dias úteis.',
      statusAfter: 'in_progress',
      authorName: 'Suporte TI',
      createdAt: '2026-09-17T12:00:00.000Z',
      minutesSpent: 25,
      isVisibleToRequester: false,
    },
    {
      ...base,
      id: 4,
      type: 'waiting_third_party',
      description: 'Rolete pedido ao fornecedor. A impressora segue funcionando só pela bandeja 1.',
      statusAfter: 'waiting_third_party',
      authorName: 'Suporte TI',
      createdAt: '2026-09-17T12:20:00.000Z',
      minutesSpent: 15,
      attachments: [
        {
          id: 9,
          ticketId: 29,
          historyId: 4,
          kind: 'pdf',
          origin: 'support',
          fileName: 'pedido-do-rolete.pdf',
          contentType: 'application/pdf',
          sizeBytes: 184_320,
          viewUrl: 'https://example.invalid/abrir',
          downloadUrl: 'https://example.invalid/baixar',
          createdAt: '2026-09-17T12:20:00.000Z',
          createdBy: 'suporte@azuos.local',
        },
      ],
    },
    {
      ...base,
      id: 5,
      type: 'resume',
      description: 'O rolete chegou. Retomando o atendimento.',
      statusAfter: 'in_progress',
      authorName: 'Suporte TI',
      createdAt: '2026-09-22T12:00:00.000Z',
    },
    {
      ...base,
      id: 6,
      type: 'closure_with_caveats',
      description:
        'Troquei o rolete de tração e a impressora voltou a puxar papel. A bandeja 2 continua ' +
        'sem travar: a peça não é mais fabricada — usar só a bandeja 1.',
      statusAfter: 'resolved_with_caveats',
      authorName: 'Suporte TI',
      createdAt: '2026-09-22T13:10:00.000Z',
      minutesSpent: 70,
    },
  ];

  const { Story } = defineMeta({
    title: 'Components/AcerolaHistoryTimeline',
    component: HistoryTimeline,
    parameters: { layout: 'padded' },
  });
</script>

<!-- A ordem de serviço inteira: espera por peça, anotação interna, anexo e encerramento. -->
<Story name="Default" args={{ data: { histories: fullStory } }} />

<!-- Só a abertura: o chamado que ninguém pegou ainda. -->
<Story name="OnlyOpening" args={{ data: { histories: [base] } }} />

<!-- Cada desfecho, para conferir que "Encerrou o chamado" aparece em palavras nos três. -->
<Story
  name="EveryClosingType"
  args={{
    data: {
      histories: [
        { ...base, id: 1, type: 'resolution', statusAfter: 'resolved', description: 'Troquei o cabo.' },
        {
          ...base,
          id: 2,
          type: 'closure_with_caveats',
          statusAfter: 'resolved_with_caveats',
          description: 'Funciona, mas a bandeja 2 segue com defeito.',
        },
        {
          ...base,
          id: 3,
          type: 'cancellation',
          statusAfter: 'cancelled',
          description: 'Duplicado do CH-0002.',
        },
        {
          ...base,
          id: 4,
          type: 'reopening',
          statusAfter: 'in_progress',
          description: 'Voltou a falhar no dia seguinte.',
        },
      ],
    },
  }}
/>

<!-- Como a consulta PÚBLICA manda: sem o tempo gasto e sem a marca de visibilidade. -->
<Story
  name="PublicLookup"
  args={{
    data: {
      histories: fullStory
        .filter((history) => history.isVisibleToRequester !== false)
        .map(({ minutesSpent: _minutes, isVisibleToRequester: _visible, ...publicHistory }) => publicHistory),
    },
  }}
/>

<Story name="Loading" args={{ data: { histories: [] }, state: { isLoading: true } }} />

<Story
  name="Empty"
  args={{
    data: { histories: [] },
    ui: { emptyLabel: 'Ainda não há andamento registrado neste chamado.' },
  }}
/>

<Story
  name="ServerDown"
  args={{ data: { histories: [] }, state: { error: 'Não consegui falar com o servidor.' } }}
/>

<!-- Caso limite: texto longo com quebras de linha, na largura de um celular. -->
<Story name="LongTextOnPhone">
  <div class="w-[360px]">
    <HistoryTimeline
      data={{
        histories: [
          {
            ...base,
            id: 1,
            type: 'update',
            authorName: 'Maria Antônia de Albuquerque Cavalcanti',
            statusAfter: 'waiting_requester',
            isVisibleToRequester: false,
            description:
              'Urgência: Média → Alta\nÁrea: Infra → Manutenção\nMáquina: nenhum → Recepção — balcão (RECEPCAO-01)\nResponsável: nenhum → Suporte TI',
          },
        ],
      }}
    />
  </div>
</Story>
