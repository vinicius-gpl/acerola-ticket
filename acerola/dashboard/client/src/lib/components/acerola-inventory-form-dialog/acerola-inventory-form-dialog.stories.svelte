<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import InventoryFormDialog, {
    type InventoryFormField,
  } from './acerola-inventory-form-dialog.svelte';
  import { type FormFieldState } from '$lib/types/form-field.type';

  /** Um campo limpo: sem valor e sem erro — é como o formulário nasce. */
  function field(value = '', error: string | null = null): FormFieldState {
    return { value, error };
  }

  const emptyFields: Record<InventoryFormField, FormFieldState> = {
    name: field(),
    category: field('other'),
    unit: field('unit'),
    location: field(),
    code: field(),
    note: field(),
  };

  const filledFields: Record<InventoryFormField, FormFieldState> = {
    name: field('Cadeira giratória com apoio de braço'),
    category: field('furniture'),
    unit: field('unit'),
    location: field('Sala da contabilidade'),
    code: field('PAT-0101'),
    note: field('Pistão trocado em março.'),
  };

  const noPhoto = { previewUrl: null, fileName: null };

  /* Um quadradinho cinza em SVG: a história não depende de arquivo nem de rede. */
  const PHOTO =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="%23cbd5e1"/></svg>',
    );

  const actions = {
    onChange: fn(),
    onBlur: fn(),
    onPhotoChange: fn(),
    onPhotoRemove: fn(),
    onSubmit: fn(),
    onClose: fn(),
  };

  const { Story } = defineMeta({
    title: 'Components/AcerolaInventoryFormDialog',
    component: InventoryFormDialog,
  });
</script>

<!-- Cadastro: o formulário em branco, como ela o abre. -->
<Story
  name="Default"
  args={{
    data: { mode: 'create', fields: emptyFields, photo: noPhoto },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Correção: os valores do produto já no lugar, com a foto que está gravada. -->
<Story
  name="Edit"
  args={{
    data: {
      mode: 'edit',
      fields: filledFields,
      photo: { previewUrl: PHOTO, fileName: null },
    },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Foto recém-escolhida: aparece o nome do arquivo junto da prévia. -->
<Story
  name="WithChosenPhoto"
  args={{
    data: {
      mode: 'create',
      fields: filledFields,
      photo: { previewUrl: PHOTO, fileName: 'cadeira-da-contabilidade.jpg' },
    },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Salvando: tudo travado e o botão dizendo o que está acontecendo. -->
<Story
  name="Submitting"
  args={{
    data: { mode: 'create', fields: filledFields, photo: noPhoto },
    state: { isOpen: true, isSubmitting: true },
    actions,
  }}
/>

<!-- Campo recusado: a mensagem fica no campo, não num aviso solto no rodapé. -->
<Story
  name="WithFieldError"
  args={{
    data: {
      mode: 'create',
      fields: { ...emptyFields, name: field('', 'Informe o nome do produto') },
      photo: noPhoto,
    },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Foto recusada: o erro é dela, e o que foi digitado continua lá. -->
<Story
  name="WithPhotoError"
  args={{
    data: { mode: 'create', fields: filledFields, photo: noPhoto },
    state: {
      isOpen: true,
      photoError: 'A foto precisa ser uma imagem (PNG, JPG, WEBP ou HEIC).',
    },
    actions,
  }}
/>

<!-- Falha na gravação: o motivo fica na tela até a pessoa resolver. -->
<Story
  name="WithSaveError"
  args={{
    data: { mode: 'create', fields: filledFields, photo: noPhoto },
    state: {
      isOpen: true,
      error: 'Já existe um produto com esse código de patrimônio.',
    },
    actions,
  }}
/>

<!-- Caso limite: nome e observação compridos não podem esticar o modal. -->
<Story
  name="LongText (edge case)"
  args={{
    data: {
      mode: 'edit',
      fields: {
        ...filledFields,
        name: field(
          'Suporte articulado de parede para monitor de até 32 polegadas com inclinação',
        ),
        note: field(
          'Comprado para a sala de reunião e nunca instalado. Está encostado atrás do armário do arquivo, ainda na caixa, esperando a decisão sobre a reforma da sala.',
        ),
      },
      photo: noPhoto,
    },
    state: { isOpen: true },
    actions,
  }}
/>
