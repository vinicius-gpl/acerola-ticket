import { ticketStatusLabel } from '@template/shared/domain/ticket-status.util';
import { type PublicServiceOrder } from '@template/shared/schemas/service-order.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ServiceOrderVerifyView, {
  type AcerolaServiceOrderVerifyViewProps,
} from './acerola-service-order-verify-view.svelte';

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

function setup(props: Partial<AcerolaServiceOrderVerifyViewProps> = {}) {
  const actions = { onRetry: vi.fn(), onFileChosen: vi.fn() };

  render(ServiceOrderVerifyView, {
    props: { data: { order, checkedFileName: null }, actions, ...props },
  });

  return actions;
}

describe('AcerolaServiceOrderVerifyView', () => {
  // feliz
  it('shows what the system registered when it issued the document', () => {
    setup();

    expect(screen.getByRole('heading', { name: 'Ordem de serviço CH-0029' })).toBeInTheDocument();
    expect(screen.getByText('Versão 2')).toBeInTheDocument();
    expect(screen.getByText(ticketStatusLabel('resolved_with_caveats'))).toBeInTheDocument();
    expect(screen.getByText('2 h 5 min')).toBeInTheDocument();
    /* Curto na tela, como no rodapé do papel; o inteiro fica um clique abaixo. */
    expect(screen.getByText('a1b2c3d4e5f6')).toBeInTheDocument();
    expect(screen.getByText(order.fileHash)).toBeInTheDocument();
  });

  it('hands over the file the person chose to be checked', async () => {
    const actions = setup();
    const file = new File(['%PDF'], 'ordem-de-servico-CH-0029.pdf', { type: 'application/pdf' });

    await userEvent.upload(screen.getByLabelText(/escolher o pdf/i), file);

    expect(actions.onFileChosen).toHaveBeenCalledWith(file);
  });

  it('says in words that the file is the one that was issued', () => {
    setup({
      data: { order, checkedFileName: 'ordem-de-servico-CH-0029.pdf' },
      state: { fileCheck: 'match' },
    });

    expect(screen.getByText('Confere')).toBeInTheDocument();
    expect(screen.getByText('ordem-de-servico-CH-0029.pdf')).toBeInTheDocument();
  });

  // triste
  it('says in words that the file was changed', () => {
    setup({ data: { order, checkedFileName: 'editado.pdf' }, state: { fileCheck: 'mismatch' } });

    expect(screen.getByText('Não confere')).toBeInTheDocument();
    expect(screen.queryByText('Confere')).not.toBeInTheDocument();
  });

  /* Abrir o link NÃO é conferir o arquivo — sem escolher o PDF, a tela não diz "confere". */
  it('claims nothing about the file before one is chosen', () => {
    setup();

    expect(screen.queryByText('Confere')).not.toBeInTheDocument();
    expect(screen.queryByText('Não confere')).not.toBeInTheDocument();
  });

  it('warns that a newer issue of the same ticket exists', () => {
    setup({
      data: { order: { ...order, version: 1, isLatest: false }, checkedFileName: null },
    });

    expect(screen.getByText(/existe uma emissão mais nova deste chamado \(versão 2\)/i)).toBeInTheDocument();
  });

  it('shows a dash for a time nobody informed, never zero', () => {
    setup({ data: { order: { ...order, totalMinutes: null }, checkedFileName: null } });

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('locks the file choice while a file is being checked', () => {
    setup({ data: { order, checkedFileName: 'a.pdf' }, state: { fileCheck: 'checking' } });

    expect(screen.getByLabelText(/escolher o pdf/i)).toBeDisabled();
  });

  it('says the file could not be read', () => {
    setup({ data: { order, checkedFileName: 'video.mp4' }, state: { fileCheck: 'unreadable' } });

    expect(screen.getByText('Não consegui ler este arquivo')).toBeInTheDocument();
  });

  /* "Não encontrado" é resposta: sem registro e sem lugar para conferir arquivo. */
  it('says no document was issued with this code', () => {
    setup({ data: { order: null, checkedFileName: null }, state: { isNotFound: true } });

    expect(screen.getByText('Não encontrei esta ordem de serviço')).toBeInTheDocument();
    expect(screen.queryByLabelText(/escolher o pdf/i)).not.toBeInTheDocument();
  });

  it('does not claim the code is unknown while it is still loading', () => {
    setup({ data: { order: null, checkedFileName: null }, state: { isLoading: true } });

    expect(screen.getByText(/procurando o registro/i)).toBeInTheDocument();
    expect(screen.queryByText('Não encontrei esta ordem de serviço')).not.toBeInTheDocument();
  });

  it('shows the failure with a way to try again', async () => {
    const actions = setup({
      data: { order: null, checkedFileName: null },
      state: { error: 'Não consegui falar com o servidor.' },
    });

    expect(screen.getByText('Não consegui falar com o servidor.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /tentar/i }));
    expect(actions.onRetry).toHaveBeenCalledOnce();
  });
});
