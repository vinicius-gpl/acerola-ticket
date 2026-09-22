<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type PublicTicket } from '@template/shared/schemas/ticket.schema';

  import TicketLookupCard from './ticket-lookup-card.svelte';

  const ticket: PublicTicket = {
    id: 7,
    protocol: 'CH-0007',
    status: 'in_progress',
    priority: 'high',
    requesterName: 'Bia Costa',
    department: 'financeiro',
    problemType: 'printer',
    anydeskId: '111 222 333',
    description: 'A impressora da sala não puxa papel e trava no meio da folha.',
    screenshotUrl: null,
    createdAt: '2026-09-15T12:10:00.000Z',
  };

  const actions = { onProtocolChange: () => {}, onSearch: () => {} };

  const { Story } = defineMeta({
    title: 'Components/TicketLookupCard',
    component: TicketLookupCard,
  });
</script>

<!-- Ninguém procurou nada ainda: só o campo e o botão. -->
<Story
  name="Default"
  args={{ data: { protocol: '', ticket: null }, state: {}, actions }}
/>

<Story
  name="Found"
  args={{ data: { protocol: 'CH-0007', ticket }, state: {}, actions }}
/>

<Story
  name="Searching"
  args={{ data: { protocol: 'CH-0007', ticket: null }, state: { isSearching: true }, actions }}
/>

<!-- "Não encontrado" é resposta, não falha do site: por isso não aparece em vermelho. -->
<Story
  name="NotFound"
  args={{ data: { protocol: 'CH-9999', ticket: null }, state: { isNotFound: true }, actions }}
/>

<!-- O aviso explica por que o botão está desligado, em vez de acusar erro. -->
<Story
  name="InvalidProtocol"
  args={{ data: { protocol: 'abc', ticket: null }, state: { isInvalid: true }, actions }}
/>

<Story
  name="ServerDown"
  args={{
    data: { protocol: 'CH-0007', ticket: null },
    state: { error: 'Não consegui falar com o servidor.' },
    actions,
  }}
/>

<!-- Caso limite: chamado com print e descrição longa, para conferir o desenho. -->
<Story
  name="LongDescriptionWithScreenshot"
  args={{
    data: {
      protocol: 'CH-0009',
      ticket: {
        ...ticket,
        id: 9,
        protocol: 'CH-0009',
        status: 'open',
        priority: 'low',
        anydeskId: null,
        screenshotUrl: 'https://example.invalid/print.png',
        description:
          'Bom dia. Desde a atualização de ontem o computador liga, mostra a tela de boas-vindas, ' +
          'fica alguns minutos carregando e só então abre a área de trabalho. Quando abre, os ' +
          'ícones demoram para aparecer e o antivírus reclama de um arquivo que não consigo ler.',
      },
    },
    state: {},
    actions,
  }}
/>
