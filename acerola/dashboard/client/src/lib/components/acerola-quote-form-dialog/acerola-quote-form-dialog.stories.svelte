<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import QuoteFormDialog, { type QuoteFormField } from './acerola-quote-form-dialog.svelte';
  import { type FormFieldState } from '$lib/types/form-field.type';

  function field(value = '', error: string | null = null): FormFieldState {
    return { value, error };
  }

  const fields: Record<QuoteFormField, FormFieldState> = {
    supplier: field('Clima Norte Refrigeração'),
    description: field('Limpeza e recarga de gás dos três aparelhos de ar-condicionado'),
    kind: field('service'),
    amount: field('960,00'),
    quotedOn: field('2026-10-02'),
    status: field('pending'),
    note: field(''),
  };

  const blank: Record<QuoteFormField, FormFieldState> = {
    supplier: field(''),
    description: field(''),
    kind: field('service'),
    amount: field(''),
    quotedOn: field('2026-10-05'),
    status: field('pending'),
    note: field(''),
  };

  const actions = {
    onChange: fn(),
    onBlur: fn(),
    onAttachmentChange: fn(),
    onAttachmentRemove: fn(),
    onSubmit: fn(),
    onClose: fn(),
  };

  const { Story } = defineMeta({
    title: 'Components/AcerolaQuoteFormDialog',
    component: QuoteFormDialog,
  });
</script>

<!-- O uso mais comum: guardar um orçamento novo, em branco. -->
<Story
  name="Default"
  args={{
    data: { mode: 'create', fields: blank, attachment: { name: null } },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Corrigindo um orçamento que já tem documento. -->
<Story
  name="Editing"
  args={{
    data: { mode: 'edit', fields, attachment: { name: 'orcamento-clima-norte.pdf' } },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Erro de campo: cada um ao lado do seu. -->
<Story
  name="WithFieldErrors"
  args={{
    data: {
      mode: 'create',
      fields: {
        ...blank,
        supplier: field('', 'Informe a empresa que fez o orçamento'),
        description: field('', 'Descreva o que foi orçado'),
        amount: field('a combinar', 'Informe o valor em reais, como 1.250,00'),
      },
      attachment: { name: null },
    },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- O arquivo foi recusado: o que já foi digitado continua na tela. -->
<Story
  name="AttachmentRefused"
  args={{
    data: { mode: 'create', fields, attachment: { name: null } },
    state: {
      isOpen: true,
      attachmentError: 'O documento precisa ser um PDF ou uma imagem (PNG, JPG ou WEBP).',
    },
    actions,
  }}
/>

<!-- A recusa do servidor ao salvar. -->
<Story
  name="SaveFailed"
  args={{
    data: { mode: 'edit', fields, attachment: { name: 'orcamento.pdf' } },
    state: {
      isOpen: true,
      error: 'Seu cargo em Manutenção só permite consultar — não alterar orçamentos.',
    },
    actions,
  }}
/>

<!-- Gravando: nada pode ser mexido. -->
<Story
  name="Submitting"
  args={{
    data: { mode: 'create', fields, attachment: { name: 'orcamento.pdf' } },
    state: { isOpen: true, isSubmitting: true },
    actions,
  }}
/>

<!-- Caso limite: empresa de nome comprido, descrição longa e nome de arquivo enorme. -->
<Story
  name="LongText (edge case)"
  args={{
    data: {
      mode: 'edit',
      fields: {
        ...fields,
        supplier: field('Construtora e Reformas Vale do Rio Vermelho Engenharia e Acabamentos'),
        description: field(
          'Reforma completa da sala de reunião: remoção do forro antigo, forro novo em gesso acartonado, pintura das quatro paredes, troca do piso por vinílico, instalação de seis pontos de tomada e passagem de cabo de rede para a mesa.',
        ),
        amount: field('48.750,00'),
      },
      attachment: {
        name: 'proposta-comercial-reforma-sala-de-reuniao-versao-final-revisada-assinada-2026.pdf',
      },
    },
    state: { isOpen: true },
    actions,
  }}
/>
