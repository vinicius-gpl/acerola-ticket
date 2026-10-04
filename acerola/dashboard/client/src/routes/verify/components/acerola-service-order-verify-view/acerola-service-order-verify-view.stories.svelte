<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type PublicServiceOrder } from '@template/shared/schemas/service-order.schema';

  import ServiceOrderVerifyView, {
    type AcerolaServiceOrderVerifyViewProps,
  } from './acerola-service-order-verify-view.svelte';

  /* Dado INVENTADO: nenhum código, protocolo ou impressão digital daqui existe. */
  const order: PublicServiceOrder = {
    code: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    protocol: 'CH-0029',
    version: 2,
    issuedAt: '2026-09-22T13:10:00.000Z',
    statusAtIssue: 'resolved_with_caveats',
    historyCount: 4,
    totalMinutes: 125,
    fileHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    isLatest: true,
    latestVersion: 2,
  };

  const actions: AcerolaServiceOrderVerifyViewProps['actions'] = {
    onRetry: () => {},
    onFileChosen: () => {},
  };

  const { Story } = defineMeta({
    title: 'Features/Verify/AcerolaServiceOrderVerifyView',
    component: ServiceOrderVerifyView,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default">
  <ServiceOrderVerifyView data={{ order, checkedFileName: null }} {actions} />
</Story>

<Story name="Checking">
  <ServiceOrderVerifyView
    data={{ order, checkedFileName: 'ordem-de-servico-CH-0029.pdf' }}
    state={{ fileCheck: 'checking' }}
    {actions}
  />
</Story>

<Story name="FileMatches">
  <ServiceOrderVerifyView
    data={{ order, checkedFileName: 'ordem-de-servico-CH-0029.pdf' }}
    state={{ fileCheck: 'match' }}
    {actions}
  />
</Story>

<Story name="FileWasChanged">
  <ServiceOrderVerifyView
    data={{ order, checkedFileName: 'ordem-de-servico-CH-0029 (editado).pdf' }}
    state={{ fileCheck: 'mismatch' }}
    {actions}
  />
</Story>

<Story name="FileUnreadable">
  <ServiceOrderVerifyView
    data={{ order, checkedFileName: 'video-da-reuniao.mp4' }}
    state={{ fileCheck: 'unreadable' }}
    {actions}
  />
</Story>

<!-- O chamado mudou depois desta emissão: o registro continua verdadeiro, mas há um mais novo. -->
<Story name="ReplacedByNewerVersion">
  <ServiceOrderVerifyView
    data={{
      order: { ...order, version: 1, isLatest: false, statusAtIssue: 'in_progress', totalMinutes: null },
      checkedFileName: null,
    }}
    {actions}
  />
</Story>

<Story name="Loading">
  <ServiceOrderVerifyView data={{ order: null, checkedFileName: null }} state={{ isLoading: true }} {actions} />
</Story>

<Story name="NotFound">
  <ServiceOrderVerifyView data={{ order: null, checkedFileName: null }} state={{ isNotFound: true }} {actions} />
</Story>

<Story name="Failure">
  <ServiceOrderVerifyView
    data={{ order: null, checkedFileName: null }}
    state={{ error: 'Não consegui falar com o servidor.' }}
    {actions}
  />
</Story>

<!-- Caso limite: nome de arquivo comprido não pode empurrar a caixa do resultado. -->
<Story name="LongFileName">
  <ServiceOrderVerifyView
    data={{
      order,
      checkedFileName:
        'ordem-de-servico-CH-0029-copia-final-revisada-pelo-financeiro-versao-para-auditoria.pdf',
    }}
    state={{ fileCheck: 'match' }}
    {actions}
  />
</Story>
