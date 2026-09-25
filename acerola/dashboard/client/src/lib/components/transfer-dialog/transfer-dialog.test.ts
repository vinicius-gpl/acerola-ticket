import { type Computer } from '@template/shared/schemas/computer.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TransferDialog, {
  currentPlaceOf,
  machineLabelOf,
  peripheralLabelOf,
  type PeripheralChoice,
} from './transfer-dialog.svelte';

const computer = {
  id: 2,
  name: 'FINANCEIRO-02',
  displayName: 'Financeiro — mesa 2',
  department: 'financeiro',
} as Computer;

function peripheral(over: Partial<PeripheralChoice> = {}): PeripheralChoice {
  return {
    partId: 7,
    label: 'Teclado USB ABNT2 — Teclado',
    quantity: 1,
    destiny: 'machine',
    destinationComputerId: '',
    ...over,
  };
}

const actions = {
  onDepartmentChange: vi.fn(),
  onResponsibleChange: vi.fn(),
  onNoteChange: vi.fn(),
  onDestinyChange: vi.fn(),
  onDestinationChange: vi.fn(),
  onSubmit: vi.fn(),
  onClose: vi.fn(),
};

const base = {
  computer,
  toDepartment: 'financeiro',
  responsible: '',
  note: '',
  departments: [
    { value: 'financeiro', label: 'Financeiro' },
    { value: 'fiscal', label: 'Fiscal' },
    { value: '', label: 'Sem departamento (volta para a prateleira)' },
  ],
  machines: [{ value: '3', label: 'CONTABIL-03' }],
  peripherals: [peripheral()],
};

function renderDialog(props: Record<string, unknown> = {}) {
  return render(TransferDialog, {
    props: {
      data: base,
      state: { isOpen: true },
      actions,
      ...props,
    } as never,
  });
}

describe('currentPlaceOf', () => {
  // feliz
  it('says where the machine is today', () => {
    expect(currentPlaceOf(computer)).toBe('FINANCEIRO');
  });

  // triste
  /* Sem departamento não é "vazio": é a prateleira, e a tela diz isso com todas as letras. */
  it('calls the shelf by its name', () => {
    expect(currentPlaceOf({ ...computer, department: null } as Computer)).toBe(
      'Sem departamento (na prateleira)',
    );
  });
});

describe('machineLabelOf', () => {
  // feliz
  it('prefers the nickname people recognise', () => {
    expect(machineLabelOf(computer)).toBe('Financeiro — mesa 2');
  });

  // triste
  it('falls back to the technical name', () => {
    expect(machineLabelOf({ ...computer, displayName: '  ' } as Computer)).toBe('FINANCEIRO-02');
  });
});

describe('peripheralLabelOf', () => {
  // feliz
  it('shows how many units are on the machine', () => {
    expect(peripheralLabelOf(peripheral({ quantity: 2 }))).toContain('(2)');
  });

  /* Uma unidade não ganha "(1)": o número só existe para avisar que são vários. */
  it('says nothing about the amount when there is only one', () => {
    expect(peripheralLabelOf(peripheral())).not.toContain('(1)');
  });
});

describe('TransferDialog', () => {
  // feliz
  it('shows where the machine is today', () => {
    renderDialog();

    expect(screen.getByText(/hoje em/)).toHaveTextContent('FINANCEIRO');
  });

  it('asks what happens to each peripheral', () => {
    renderDialog();

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('Teclado USB ABNT2 — Teclado')).toBeInTheDocument();
    expect(dialog.getByRole('radio', { name: 'Vai junto com a máquina' })).toBeChecked();
  });

  it('tells the screen a peripheral is staying behind', async () => {
    renderDialog();

    await userEvent.click(screen.getByRole('radio', { name: 'Fica na estação' }));

    expect(actions.onDestinyChange).toHaveBeenCalledWith(7, 'station');
  });

  /* Quem fica precisa dizer onde fica, e o seletor só aparece depois da escolha. */
  it('asks which machine takes over only for what stays', async () => {
    renderDialog({ data: { ...base, peripherals: [peripheral({ destiny: 'station' })] } });

    expect(
      screen.getByLabelText('Máquina que assume Teclado USB ABNT2 — Teclado'),
    ).toBeInTheDocument();
  });

  it('warns what the machine loses when it goes back to the shelf', () => {
    renderDialog({ data: { ...base, toDepartment: '' } });

    expect(screen.getByText(/passa a se chamar/)).toHaveTextContent('Reserva — FINANCEIRO-02');
  });

  it('submits the transfer', async () => {
    renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Transferir' }));

    expect(actions.onSubmit).toHaveBeenCalled();
  });

  // triste
  /* Falta dizer quem assume a peça: o botão trava, em vez de gravar pela metade. */
  it('blocks the transfer while a destination is missing', async () => {
    renderDialog({
      data: { ...base, peripherals: [peripheral({ destiny: 'station' })] },
      state: { isOpen: true, isIncomplete: true },
    });

    expect(screen.getByText(/Falta dizer qual máquina assume/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Transferir' })).toBeDisabled();
  });

  it('shows the reason the server refused', () => {
    renderDialog({
      state: { isOpen: true, error: 'A máquina já está nesse departamento.' },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('A máquina já está nesse departamento.');
  });

  /* Sem peça na máquina a pergunta some: um bloco vazio faria pensar que faltou carregar. */
  it('hides the peripheral question when there is nothing on the machine', () => {
    renderDialog({ data: { ...base, peripherals: [] } });

    expect(screen.queryByText(/o que vai junto/i)).toBeNull();
  });

  it('says it is still looking for the peripherals', () => {
    renderDialog({
      data: { ...base, peripherals: [] },
      state: { isOpen: true, isLoadingPeripherals: true },
    });

    expect(screen.getByText('Vendo quais peças estão nesta máquina…')).toBeInTheDocument();
  });
});
