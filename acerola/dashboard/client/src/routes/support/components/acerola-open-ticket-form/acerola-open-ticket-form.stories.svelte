<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import { type FormFieldState } from '$lib/types/form-field.type';
  import OpenTicketForm, { type OpenTicketField } from './acerola-open-ticket-form.svelte';

  const field = (value: string, error: string | null = null): FormFieldState => ({ value, error });

  const emptyFields: Record<OpenTicketField, FormFieldState> = {
    requesterName: field(''),
    /* Vazia de propósito: é a primeira escolha de verdade, numa etapa própria de cards. */
    area: field(''),
    department: field('analyze'),
    problemType: field('network'),
    anydeskId: field(''),
    priority: field('medium'),
    contactPhone: field(''),
    description: field(''),
    projectId: field(''),
  };

  const filledFields: Record<OpenTicketField, FormFieldState> = {
    requesterName: field('Bia Costa'),
    area: field('infra'),
    department: field('financeiro'),
    problemType: field('printer'),
    anydeskId: field('111 222 333'),
    priority: field('high'),
    contactPhone: field('62 99999-9999'),
    description: field('A impressora da sala não puxa papel.'),
    projectId: field(''),
  };

  const actions = {
    onChange: () => {},
    onBlur: () => {},
    onNotifyChange: () => {},
    onScreenshotChange: () => {},
    onAttachmentsChange: () => {},
    onAttachmentError: () => {},
    onSubmit: () => {},
    onOpenAnother: () => {},
  };

  const { Story } = defineMeta({
    title: 'Features/Support/AcerolaOpenTicketForm',
    component: OpenTicketForm,
  });
</script>

<Story
  name="Default"
  args={{
    data: { fields: emptyFields, notifyWhatsapp: false, screenshotName: null,
    attachments: [], opened: null },
    state: {},
    actions,
  }}
/>

<Story
  name="Filled"
  args={{
    data: { fields: filledFields, notifyWhatsapp: true, screenshotName: null,
    attachments: [], opened: null },
    state: {},
    actions,
  }}
/>

<!-- #13: área Manutenção — o tipo de problema vem de outra lista, sem "rede caiu". -->
<Story
  name="MaintenanceArea"
  args={{
    data: {
      fields: {
        ...filledFields,
        area: field('manutencao'),
        problemType: field('air_conditioning'),
      },
      notifyWhatsapp: false,
      screenshotName: null,
      attachments: [],
      opened: null,
    },
    state: {},
    actions,
  }}
/>

<!-- O erro fica colado no campo, nunca num resumo no topo. -->
<Story
  name="WithValidationErrors"
  args={{
    data: {
      fields: {
        ...emptyFields,
        /* A área é a PRIMEIRA validação que aparece — a pessoa vê isso sem nem clicar em
           "Avançar" (ver `missingRequiredFields`). As de baixo aparecem ao avançar. */
        area: field('', 'Escolha a área do chamado'),
        requesterName: field('', 'Informe seu nome'),
        contactPhone: field('99999', 'Informe o WhatsApp com DDD'),
        description: field('', 'Descreva o problema'),
      },
      notifyWhatsapp: false,
      screenshotName: null,
    attachments: [],
      opened: null,
    },
    state: {},
    actions,
  }}
/>

<Story
  name="Submitting"
  args={{
    data: { fields: filledFields, notifyWhatsapp: true, screenshotName: null,
    attachments: [], opened: null },
    state: { isSubmitting: true },
    actions,
  }}
/>

<Story
  name="WithScreenshotChosen"
  args={{
    data: {
      fields: filledFields,
      notifyWhatsapp: false,
      screenshotName: 'erro-da-impressora.png',
      attachments: [],
      opened: null,
    },
    state: {},
    actions,
  }}
/>

<!-- #13: escolheu um arquivo que não é imagem — a recusa aparece NA ESCOLHA, antes do envio. -->
<Story
  name="ScreenshotRefused"
  args={{
    data: {
      fields: filledFields,
      notifyWhatsapp: false,
      screenshotName: null,
      attachments: [],
      opened: null,
    },
    state: { screenshotError: 'O print precisa ser uma imagem (PNG, JPG, WEBP, GIF ou BMP).' },
    actions,
  }}
/>

<Story
  name="ServerRefused"
  args={{
    data: { fields: filledFields, notifyWhatsapp: false, screenshotName: null,
    attachments: [], opened: null },
    state: { error: 'O print precisa ser uma imagem (PNG, JPG ou WEBP).' },
    actions,
  }}
/>

<!-- Depois de abrir, o formulário sai da tela: o protocolo é o que a pessoa precisa levar. -->
<Story
  name="Opened"
  args={{
    data: {
      fields: emptyFields,
      notifyWhatsapp: false,
      screenshotName: null,
    attachments: [],
      opened: { protocol: 'CH-0013', whatsAppLink: null },
    },
    state: {},
    actions,
  }}
/>

<Story
  name="OpenedWithWhatsApp"
  args={{
    data: {
      fields: emptyFields,
      notifyWhatsapp: true,
      screenshotName: null,
    attachments: [],
      opened: { protocol: 'CH-0013', whatsAppLink: 'https://wa.me/5562999999999?text=Protocolo' },
    },
    state: {},
    actions,
  }}
/>
