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
  onSubmit: vi.fn(),
  onOpenAnother: vi.fn(),
};

function setup(props: Record<string, unknown> = {}) {
  return render(OpenTicketForm, {
    props: {
      data: { fields, notifyWhatsapp: false, screenshotName: null, opened: null },
      state: {},
      actions,
      ...props,
    },
  });
}

describe('OpenTicketForm', () => {
  // feliz
  it('shows the form fields in Portuguese, since whoever opens a ticket is not from IT', () => {
    setup();

    expect(screen.getByLabelText(/seu nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/seu whatsapp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descrição do problema/i)).toBeInTheDocument();
  });

  it('asks to submit when the button is pressed', async () => {
    const onSubmit = vi.fn();
    setup({ actions: { ...actions, onSubmit } });

    await userEvent.click(screen.getByRole('button', { name: /abrir chamado/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('reports the chosen screenshot, so the person can check what will be attached', () => {
    setup({
      data: { fields, notifyWhatsapp: false, screenshotName: 'erro.png', opened: null },
    });

    expect(screen.getByText(/erro\.png/)).toBeInTheDocument();
  });

  /* O protocolo é o único dado que a pessoa precisa levar daqui. */
  it('replaces the form with the protocol once the ticket was opened', () => {
    setup({
      data: {
        fields,
        notifyWhatsapp: false,
        screenshotName: null,
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
        opened: null,
      },
    });

    expect(screen.getByText('Informe seu nome')).toBeInTheDocument();
    expect(screen.getByText('Informe o WhatsApp com DDD')).toBeInTheDocument();
  });

  it('shows the server refusal without throwing away what was typed', () => {
    setup({ state: { error: 'O print precisa ser uma imagem (PNG, JPG ou WEBP).' } });

    expect(screen.getByText(/o print precisa ser uma imagem/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/seu nome/i)).toHaveValue('Bia Costa');
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
        opened: { protocol: 'CH-0013', whatsAppLink: null },
      },
    });

    expect(screen.queryByRole('link', { name: /whatsapp/i })).not.toBeInTheDocument();
  });
});
