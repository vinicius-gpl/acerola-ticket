<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import AttachmentPicker from './acerola-attachment-picker.svelte';

  const { Story } = defineMeta({
    title: 'Components/AcerolaAttachmentPicker',
    component: AttachmentPicker,
  });

  /** Arquivos de mentira, só para a story ter o que listar. */
  function fake(name: string, type: string, sizeBytes: number): File {
    const file = new File(['x'], name, { type });
    Object.defineProperty(file, 'size', { value: sizeBytes });

    return file;
  }

  const chosen = [
    fake('nota-fiscal.pdf', 'application/pdf', 2 * 1024 * 1024),
    fake('antes.png', 'image/png', 900_000),
  ];

  const actions = { onChange: () => {}, onError: () => {} };
</script>

<Story name="Default" args={{ data: { files: [] }, actions }} />

<Story name="With chosen files" args={{ data: { files: chosen }, actions }} />

<!-- O teto conta o que o chamado já tem: aqui os dois vídeos já foram. -->
<Story
  name="Video limit already used"
  args={{ data: { files: [], existingKinds: ['video', 'video'] }, actions }}
/>

<Story
  name="Refused"
  args={{
    data: { files: [] },
    state: { error: 'tela.png: imagem pode ter até 5 MB.' },
    actions,
  }}
/>

<Story name="Disabled while sending" args={{ data: { files: chosen }, state: { isDisabled: true }, actions }} />

<!-- Caso limite: nome longo demais para a largura do campo. -->
<Story
  name="Very long file name"
  args={{
    data: {
      files: [fake('gravacao-da-tela-do-erro-do-sistema-interno-em-28-09-2026.mp4', 'video/mp4', 41_000_000)],
    },
    actions,
  }}
/>
