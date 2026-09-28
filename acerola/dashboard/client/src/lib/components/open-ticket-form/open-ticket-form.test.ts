import { formatPhoneInput } from '@template/shared/domain/phone.util';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type FormFieldState } from '$lib/types/form-field.type';
import OpenTicketForm, { type OpenTicketField } from './open-ticket-form.svelte';

const field = (value: string, error: string | null = null): FormFieldState => ({ value, error });

const fields: Record<OpenTicketField, FormFieldState> = {
  requesterName: field('Bia Costa'),
  department: field('financeiro'),
  problemType: field('printer'),
  anydeskId: field(''),
  priority: field('medium'),
  contactPhone: field('62 99999-9999'),
  description: field('A impressora não puxa papel.'),
};

const actions = {
  onChange: vi.fn(),
  onBlur: vi.fn(),
  onNotifyChange: vi.fn(),
  onScreenshotChange: vi.fn(),
  onAttachmentsChange: vi.fn(),
  onAttachmentError: vi.fn(),
  onSubmit: vi.fn(),
  onOpenAnother: vi.fn(),
};

function setup(props: Record<string, unknown> = {}) {
  return render(OpenTicketForm, {
    props: {
      data: { fields, notifyWhatsapp: false, screenshotName: null, attachments: [], opened: null },
      state: {},
      actions,
      ...props,
    },
  });
}

/** Vai da primeira etapa até a de índice `index` (0 = "Quem é você"), clicando Avançar. */
async function advanceTo(user: ReturnType<typeof userEvent.setup>, index: number) {
  for (let step = 0; step < index; step += 1) {
    await user.click(screen.getByRole('button', { name: /avançar/i }));
  }
}

describe('OpenTicketForm', () => {
  // feliz
  it('opens on the first step, asking who is filing the ticket', () => {
    setup();

    expect(screen.getByLabelText(/seu nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/seu whatsapp/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/descrição do problema/i)).not.toBeInTheDocument();
    expect(screen.getByText(/etapa 1 de 4/i)).toBeInTheDocument();
  });

  it('moves forward and back between steps without losing what was typed elsewhere', async () => {
    const user = userEvent.setup();
    setup();

    await advanceTo(user, 2);
    expect(screen.getByLabelText(/descrição do problema/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /voltar/i }));
    expect(screen.getByText(/sobre o problema/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/descrição do problema/i)).not.toBeInTheDocument();
  });

  /* Reproduz o hook de verdade (`useOpenTicketModel`): cada `onChange` recalcula o campo e
     renderiza de novo, como o TanStack Form faz a cada tecla. É o que garante que o telefone
     acaba mascarado NA TELA, e não só no dado interno. */
  it('masks the WhatsApp number as the person types digits, and drops any letter', async () => {
    const user = userEvent.setup();
    let currentFields = { ...fields, contactPhone: field('') };

    function handleChange(name: OpenTicketField, value: string) {
      const nextValue = name === 'contactPhone' ? formatPhoneInput(value) : value;
      currentFields = { ...currentFields, [name]: field(nextValue) };
      rendered.rerender({
        data: {
          fields: currentFields,
          notifyWhatsapp: false,
          screenshotName: null,
          attachments: [],
          opened: null,
        },
        state: {},
        actions: { ...actions, onChange: handleChange },
      });
    }

    const rendered = render(OpenTicketForm, {
      props: {
        data: {
          fields: currentFields,
          notifyWhatsapp: false,
          screenshotName: null,
          attachments: [],
          opened: null,
        },
        state: {},
        actions: { ...actions, onChange: handleChange },
      },
    });

    const phoneInput = screen.getByLabelText(/seu whatsapp/i);
    await user.type(phoneInput, 'abc62999999999xyz');

    expect(phoneInput).toHaveValue('62 99999-9999');
  });

  it('reports the chosen screenshot on its own step, so the person can check what will be attached', async () => {
    const user = userEvent.setup();
    setup({
      data: {
        fields,
        notifyWhatsapp: false,
        screenshotName: 'erro.png',
        attachments: [],
        opened: null,
      },
    });

    await advanceTo(user, 2);

    expect(screen.getByText(/erro\.png/)).toBeInTheDocument();
  });

  it('lets the person remove the screenshot they chose', async () => {
    const user = userEvent.setup();
    const onScreenshotChange = vi.fn();
    setup({
      data: {
        fields,
        notifyWhatsapp: false,
        screenshotName: 'erro.png',
        attachments: [],
        opened: null,
      },
      actions: { ...actions, onScreenshotChange },
    });

    await advanceTo(user, 2);
    await user.click(screen.getByRole('button', { name: /remover o print/i }));

    expect(onScreenshotChange).toHaveBeenCalledWith(null);
  });

  it('asks to submit only from the last step', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    setup({ actions: { ...actions, onSubmit } });

    expect(screen.queryByRole('button', { name: /abrir chamado/i })).not.toBeInTheDocument();

    await advanceTo(user, 3);
    await user.click(screen.getByRole('button', { name: /abrir chamado/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  /* O protocolo é o único dado que a pessoa precisa levar daqui. */
  it('replaces the form with the protocol once the ticket was opened', () => {
    setup({
      data: {
        fields,
        notifyWhatsapp: false,
        screenshotName: null,
        attachments: [],
        opened: { protocol: 'CH-0013', whatsAppLink: null },
      },
    });

    expect(screen.getByText('CH-0013')).toBeInTheDocument();
    expect(screen.queryByLabelText(/seu nome/i)).not.toBeInTheDocument();
  });

  it('offers the WhatsApp link when the person asked to be notified', () => {
    setup({
      data: {
        fields,
        notifyWhatsapp: true,
        screenshotName: null,
        attachments: [],
        opened: { protocol: 'CH-0013', whatsAppLink: 'https://wa.me/5562999999999?text=oi' },
      },
    });

    expect(screen.getByRole('link', { name: /receber o protocolo no whatsapp/i })).toHaveAttribute(
      'href',
      'https://wa.me/5562999999999?text=oi',
    );
  });

  // triste
  it('shows each validation error next to its own field, never as a summary on top', () => {
    setup({
      data: {
        fields: {
          ...fields,
          requesterName: field('', 'Informe seu nome'),
          contactPhone: field('99999', 'Informe o WhatsApp com DDD'),
        },
        notifyWhatsapp: false,
        screenshotName: null,
        attachments: [],
        opened: null,
      },
    });

    expect(screen.getByText('Informe seu nome')).toBeInTheDocument();
    expect(screen.getByText('Informe o WhatsApp com DDD')).toBeInTheDocument();
  });

  /* Sem isso, a recusa só aparece na última etapa, sem dizer que o problema está lá atrás. */
  it('jumps back to the first step with an error after a failed submit attempt', async () => {
    const user = userEvent.setup();
    const { rerender } = setup();

    await advanceTo(user, 3);
    await user.click(screen.getByRole('button', { name: /abrir chamado/i }));

    /* Simula o hook de verdade devolvendo o erro depois da tentativa de envio. */
    await rerender({
      data: {
        fields: { ...fields, requesterName: field('', 'Informe seu nome') },
        notifyWhatsapp: false,
        screenshotName: null,
        attachments: [],
        opened: null,
      },
      state: {},
      actions,
    });

    expect(screen.getByLabelText(/seu nome/i)).toBeInTheDocument();
    expect(screen.getByText('Informe seu nome')).toBeInTheDocument();
  });

  it('shows the server refusal on the last step without throwing away what was typed', async () => {
    const user = userEvent.setup();
    setup({ state: { error: 'O print precisa ser uma imagem (PNG, JPG ou WEBP).' } });

    await advanceTo(user, 3);

    expect(screen.getByText(/o print precisa ser uma imagem/i)).toBeInTheDocument();

    /* Voltar não é reiniciar: o que foi digitado numa etapa anterior continua lá. */
    await user.click(screen.getByRole('button', { name: /voltar/i }));
    expect(screen.getByLabelText(/descrição do problema/i)).toHaveValue(
      'A impressora não puxa papel.',
    );
  });

  it('blocks the fields while submitting, so two clicks do not open two tickets', () => {
    setup({ state: { isSubmitting: true } });

    expect(screen.getByLabelText(/seu nome/i)).toBeDisabled();
  });

  /* Sem o link, o botão não aparece: ter o telefone não é autorização para usá-lo. */
  it('hides the WhatsApp button when there is no link to offer', () => {
    setup({
      data: {
        fields,
        notifyWhatsapp: false,
        screenshotName: null,
        attachments: [],
        opened: { protocol: 'CH-0013', whatsAppLink: null },
      },
    });

    expect(screen.queryByRole('link', { name: /whatsapp/i })).not.toBeInTheDocument();
  });
});
