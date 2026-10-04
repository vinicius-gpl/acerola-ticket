<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type TicketHistory } from '@template/shared/schemas/ticket-history.schema';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  import TicketDetailView, {
    type AcerolaTicketDetailViewProps,
  } from './acerola-ticket-detail-view.svelte';

  /* Dado INVENTADO: nenhum nome, telefone ou arquivo daqui existe. */
  const ticket: Ticket = {
    id: 29,
    protocol: 'CH-0029',
    status: 'waiting_third_party',
    priority: 'medium',
    requesterName: 'Quitéria Sampaio',
    area: 'infra',
    department: 'pessoal',
    problemType: 'printer',
    participantAreas: [],
    computerId: null,
    computerName: null,
    anydeskId: '321 654 987',
    contactPhone: '62999990029',
    notifyWhatsapp: true,
    description: 'A impressora do setor não puxa papel de nenhuma das duas bandejas.',
    screenshotUrl: null,
    assignee: 'Suporte TI',
    solution: null,
    createdAt: '2026-09-17T11:00:00.000Z',
    startedAt: '2026-09-17T11:30:00.000Z',
    resolvedAt: null,
    updatedAt: '2026-09-17T12:20:00.000Z',
    updatedBy: 'suporte@azuos.local',
  };

  const opening: TicketHistory = {
    id: 1,
    ticketId: 29,
    type: 'opening',
    description: 'Chamado aberto.',
    statusAfter: 'open',
    isVisibleToRequester: true,
    minutesSpent: null,
    authorName: 'Quitéria Sampaio',
    createdBy: null,
    createdAt: '2026-09-17T11:00:00.000Z',
    attachments: [],
  };

  const histories: TicketHistory[] = [
    opening,
    {
      ...opening,
      id: 2,
      type: 'start',
      description: 'Assumi o chamado. O rolete de tração está gasto e a bandeja 2 não trava.',
      statusAfter: 'in_progress',
      authorName: 'Suporte TI',
      createdBy: 'suporte@azuos.local',
      createdAt: '2026-09-17T11:30:00.000Z',
      minutesSpent: 40,
    },
    {
      ...opening,
      id: 3,
      type: 'waiting_third_party',
      description: 'Rolete pedido ao fornecedor. A impressora segue funcionando só pela bandeja 1.',
      statusAfter: 'waiting_third_party',
      authorName: 'Suporte TI',
      createdBy: 'suporte@azuos.local',
      createdAt: '2026-09-17T12:20:00.000Z',
      minutesSpent: 15,
    },
  ];

  const data: AcerolaTicketDetailViewProps['data'] = {
    ticket,
    histories,
    attachments: [
      {
        id: 4,
        ticketId: 29,
        historyId: null,
        kind: 'image',
        origin: 'requester',
        fileName: 'foto-da-impressora.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 482_000,
        viewUrl: 'https://example.invalid/abrir',
        downloadUrl: 'https://example.invalid/baixar',
        createdAt: '2026-09-17T11:00:00.000Z',
        createdBy: null,
      },
    ],
    whatsAppLink: 'https://example.invalid/whatsapp',
  };

  const actions: AcerolaTicketDetailViewProps['actions'] = {
    onBack: () => {},
    onDownloadServiceOrder: () => {},
    onRemoveAttachment: () => {},
  };

  const { Story } = defineMeta({
    title: 'Features/Tickets/AcerolaTicketDetailView',
    component: TicketDetailView,
    parameters: { layout: 'fullscreen' },
  });
</script>

<!-- Os dois formulários têm histórias próprias (`AcerolaTicketHistoryForm`,
     `AcerolaTicketDataForm`): aqui eles entram como um marcador, para a história mostrar a
     ficha — o lugar que ela reserva para eles — sem repetir o que as outras já mostram. -->
{#snippet historyForm()}
  <p class="text-muted-foreground text-sm">[ formulário de novo histórico ]</p>
{/snippet}

{#snippet dataForm()}
  <p class="text-muted-foreground text-sm">[ formulário de dados do chamado ]</p>
{/snippet}

<Story name="Default">
  <TicketDetailView {data} {actions} {historyForm} {dataForm} />
</Story>

<!-- Recém-aberto: só a abertura na linha do tempo, sem responsável e sem aviso de WhatsApp. -->
<Story name="FreshTicket">
  <TicketDetailView
    data={{
      ticket: { ...ticket, status: 'open', assignee: null, startedAt: null, notifyWhatsapp: false },
      histories: [opening],
      attachments: [],
      whatsAppLink: null,
    }}
    {actions}
    {historyForm}
    {dataForm}
  />
</Story>

<!-- Encerrado com ressalva: o bloco do formulário vira "Reabrir o chamado". -->
<Story name="ClosedWithCaveats">
  <TicketDetailView
    data={{
      ...data,
      ticket: {
        ...ticket,
        status: 'resolved_with_caveats',
        resolvedAt: '2026-09-22T13:10:00.000Z',
        computerId: 4,
        computerName: 'PESSOAL-01',
        participantAreas: ['manutencao'],
      },
      histories: [
        ...histories,
        {
          ...opening,
          id: 4,
          type: 'closure_with_caveats',
          description: 'Troquei o rolete. A bandeja 2 segue com defeito: usar só a bandeja 1.',
          statusAfter: 'resolved_with_caveats',
          authorName: 'Suporte TI',
          createdBy: 'suporte@azuos.local',
          createdAt: '2026-09-22T13:10:00.000Z',
          minutesSpent: 70,
        },
      ],
    }}
    {actions}
    {historyForm}
    {dataForm}
  />
</Story>

<Story name="LoadingTimeline">
  <TicketDetailView
    data={{ ...data, histories: [], attachments: [] }}
    state={{ isTimelineLoading: true, isAttachmentsLoading: true }}
    {actions}
    {historyForm}
    {dataForm}
  />
</Story>

<Story name="GeneratingServiceOrder">
  <TicketDetailView
    {data}
    state={{ isDownloadingServiceOrder: true }}
    {actions}
    {historyForm}
    {dataForm}
  />
</Story>

<Story name="WithFailures">
  <TicketDetailView
    data={{ ...data, histories: [] }}
    state={{
      timelineError: 'Não consegui ler a linha do tempo.',
      serviceOrderError: 'Não consegui gerar a ordem de serviço.',
    }}
    {actions}
    {historyForm}
    {dataForm}
  />
</Story>

<!-- Caso limite: descrição longa e print, para conferir o desenho do bloco do pedido. -->
<Story name="LongDescriptionWithScreenshot">
  <TicketDetailView
    data={{
      ...data,
      ticket: {
        ...ticket,
        screenshotUrl: 'https://example.invalid/print.png',
        description:
          'Bom dia. Desde a atualização de ontem o computador liga, mostra a tela de boas-vindas, ' +
          'fica alguns minutos carregando e só então abre a área de trabalho.\n\nQuando abre, os ' +
          'ícones demoram para aparecer e o antivírus reclama de um arquivo que não consigo ler ' +
          'o nome. Tentei reiniciar três vezes e desligar da tomada, mas continua igual.',
      },
    }}
    {actions}
    {historyForm}
    {dataForm}
  />
</Story>
