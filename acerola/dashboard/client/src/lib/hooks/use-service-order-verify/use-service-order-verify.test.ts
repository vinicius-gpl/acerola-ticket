import { type PublicServiceOrder } from '@template/shared/schemas/service-order.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import { sha256HexFallback } from '$lib/utils/sha256.util';
import Harness from './use-service-order-verify-harness.test.svelte';
import {
  checkFile,
  MAX_CHECKED_FILE_BYTES,
  type ServiceOrderVerifyModel,
} from './use-service-order-verify.svelte';

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: { verifyServiceOrder: vi.fn() },
}));

const { ticketsApi } = await import('$lib/api/tickets.api');

const CODE = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

/* Um "PDF" inventado: o que importa é que a impressão digital registrada é a DELE. */
const ISSUED_BYTES = new TextEncoder().encode('%PDF-1.4 ordem de serviço de mentira');
const issuedFile = () => new File([ISSUED_BYTES], 'ordem-de-servico-CH-0007.pdf');

const order: PublicServiceOrder = {
  code: CODE,
  protocol: 'CH-0007',
  version: 1,
  issuedAt: '2026-09-17T12:00:00.000Z',
  statusAtIssue: 'in_progress',
  historyCount: 3,
  totalMinutes: 55,
  fileHash: sha256HexFallback(ISSUED_BYTES),
  isLatest: true,
  latestVersion: 1,
};

function mountModel(reference = CODE): ServiceOrderVerifyModel {
  let model!: ServiceOrderVerifyModel;
  render(Harness, {
    props: { reference, onReady: (ready: ServiceOrderVerifyModel) => (model = ready) },
  });

  return model;
}

describe('checkFile', () => {
  // feliz
  it('matches the very file that was issued', async () => {
    expect(await checkFile(issuedFile(), order.fileHash)).toBe('match');
  });

  // triste
  it('does not match a file that was changed', async () => {
    const changed = new File([ISSUED_BYTES, '!'], 'ordem-de-servico-CH-0007.pdf');

    expect(await checkFile(changed, order.fileHash)).toBe('mismatch');
  });

  it('gives up on a file far too big to be a service order', async () => {
    const huge = { size: MAX_CHECKED_FILE_BYTES + 1 } as File;

    expect(await checkFile(huge, order.fileHash)).toBe('unreadable');
  });

  it('says the file could not be read instead of hanging', async () => {
    const broken = { size: 10, arrayBuffer: () => Promise.reject(new Error('gone')) } as unknown as File;

    expect(await checkFile(broken, order.fileHash)).toBe('unreadable');
  });
});

describe('useServiceOrderVerifyModel', () => {
  beforeEach(() => {
    vi.mocked(ticketsApi.verifyServiceOrder).mockReset();
    vi.mocked(ticketsApi.verifyServiceOrder).mockResolvedValue(order);
  });

  // feliz
  it('finds the issue for the code in the address', async () => {
    const model = mountModel();

    expect(model.state.isLoading).toBe(true);

    await waitFor(() => expect(model.data.order?.protocol).toBe('CH-0007'));
    expect(ticketsApi.verifyServiceOrder).toHaveBeenCalledWith(CODE);
    expect(model.state.fileCheck).toBe('idle');
  });

  it('confirms the file the person has is the one that was issued', async () => {
    const model = mountModel();
    await waitFor(() => expect(model.data.order).not.toBeNull());

    model.actions.onFileChosen(issuedFile());

    await waitFor(() => expect(model.state.fileCheck).toBe('match'));
    expect(model.data.checkedFileName).toBe('ordem-de-servico-CH-0007.pdf');
  });

  it('goes back to the start when the file is taken away', async () => {
    const model = mountModel();
    await waitFor(() => expect(model.data.order).not.toBeNull());

    model.actions.onFileChosen(issuedFile());
    await waitFor(() => expect(model.state.fileCheck).toBe('match'));
    model.actions.onFileChosen(null);

    await waitFor(() => expect(model.state.fileCheck).toBe('idle'));
    expect(model.data.checkedFileName).toBeNull();
  });

  // triste
  it('says the file was changed when the fingerprint does not match', async () => {
    const model = mountModel();
    await waitFor(() => expect(model.data.order).not.toBeNull());

    model.actions.onFileChosen(new File(['outro arquivo'], 'editado.pdf'));

    await waitFor(() => expect(model.state.fileCheck).toBe('mismatch'));
  });

  /* "Não encontrado" é resposta, e não falha do sistema: vira aviso próprio, sem vermelho. */
  it('treats a code that does not exist as an answer, not as a failure', async () => {
    vi.mocked(ticketsApi.verifyServiceOrder).mockRejectedValue(new ApiError(404, 'Não encontrei.'));
    const model = mountModel('0'.repeat(64));

    await waitFor(() => expect(model.state.isNotFound).toBe(true));
    expect(model.state.error).toBeNull();
    expect(model.data.order).toBeNull();
  });

  it('shows why the record could not be read', async () => {
    vi.mocked(ticketsApi.verifyServiceOrder).mockRejectedValue(
      new ApiError(500, 'Não consegui falar com o servidor.'),
    );
    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('Não consegui falar com o servidor.'));
    expect(model.state.isNotFound).toBe(false);
  });

  it('does not check a file before the record arrived', async () => {
    vi.mocked(ticketsApi.verifyServiceOrder).mockReturnValue(new Promise(() => {}));
    const model = mountModel();

    model.actions.onFileChosen(issuedFile());

    expect(model.state.fileCheck).toBe('idle');
  });
});
