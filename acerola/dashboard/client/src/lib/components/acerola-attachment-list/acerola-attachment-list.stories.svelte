<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import AttachmentList from './acerola-attachment-list.svelte';

  const { Story } = defineMeta({ title: 'Components/AcerolaAttachmentList', component: AttachmentList });

  const file = (over: Record<string, unknown> = {}) => ({
    id: 1,
    ticketId: 7,
    historyId: null,
    kind: 'pdf' as const,
    origin: 'support' as const,
    fileName: 'nota-fiscal.pdf',
    contentType: 'application/pdf',
    sizeBytes: 2 * 1024 * 1024,
    viewUrl: 'https://exemplo/abrir',
    downloadUrl: 'https://exemplo/baixar',
    createdAt: '2026-09-28T12:00:00.000Z',
    createdBy: null,
    ...over,
  });

  const mixed = [
    file(),
    file({ id: 2, kind: 'image', fileName: 'antes.png', contentType: 'image/png', sizeBytes: 900_000 }),
    file({ id: 3, kind: 'video', fileName: 'defeito.mp4', contentType: 'video/mp4', sizeBytes: 34_000_000 }),
    file({ id: 4, kind: 'excel', fileName: 'orcamento.xlsx', sizeBytes: 120_000 }),
  ];

  const actions = { onRemove: () => {} };
</script>

<!-- Só leitura: é a consulta pública, onde ninguém exclui. -->
<Story name="Default" args={{ data: { attachments: mixed } }} />

<Story name="With remove" args={{ data: { attachments: mixed }, actions }} />

<Story
  name="Removing one"
  args={{ data: { attachments: mixed }, state: { removingId: 2 }, actions }}
/>

<Story name="Loading" args={{ data: { attachments: [] }, state: { isLoading: true } }} />

<Story
  name="Empty"
  args={{ data: { attachments: [] }, ui: { emptyLabel: 'Nenhum arquivo neste chamado.' } }}
/>

<Story
  name="Delete failed"
  args={{
    data: { attachments: mixed },
    state: { error: 'Seu perfil não permite atender chamados.' },
    actions,
  }}
/>

<!-- Caso limite: nome longo demais para a largura da linha. -->
<Story
  name="Very long file name"
  args={{
    data: {
      attachments: [
        file({
          fileName:
            'nota-fiscal-servico-manutencao-preventiva-estacao-recepcao-setembro-2026-revisada.pdf',
        }),
      ],
    },
    actions,
  }}
/>

<!-- OS DOIS LADOS na mesma lista: o botão de excluir aparece POR ARQUIVO.
     Quem está olhando é o TI, então ele apaga o que anexou e não apaga o que a pessoa
     mandou — e a linha diz de quem é cada um, para a ausência do botão ter explicação. -->
<Story
  name="Dois lados, visto pelo TI"
  args={{
    data: {
      attachments: [
        file({ id: 1, origin: 'requester', fileName: 'print-do-erro.png', kind: 'image' }),
        file({ id: 2, origin: 'requester', fileName: 'planilha-que-trava.xlsx', kind: 'excel' }),
        file({ id: 3, origin: 'support', fileName: 'nota-da-peca.pdf' }),
      ],
    },
    ui: { actor: 'support' },
    actions,
  }}
/>

<!-- A mesma lista vista por quem ABRIU o chamado: agora é o contrário. -->
<Story
  name="Dois lados, visto por quem abriu"
  args={{
    data: {
      attachments: [
        file({ id: 1, origin: 'requester', fileName: 'print-do-erro.png', kind: 'image' }),
        file({ id: 3, origin: 'support', fileName: 'nota-da-peca.pdf' }),
      ],
    },
    ui: { actor: 'requester' },
    actions,
  }}
/>
