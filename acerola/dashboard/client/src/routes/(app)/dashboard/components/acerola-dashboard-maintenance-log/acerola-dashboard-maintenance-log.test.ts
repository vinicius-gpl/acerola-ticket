import {
  type MaintenanceEntry,
  type PlannedMaintenance,
} from '@template/shared/schemas/dashboard.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import DashboardMaintenanceLog, {
  performerOf,
  summaryOf,
  waitingOf,
} from './acerola-dashboard-maintenance-log.svelte';

function entry(over: Partial<MaintenanceEntry> = {}): MaintenanceEntry {
  return {
    id: 1,
    computerName: 'CONTABIL-03',
    type: 'preventive',
    description: 'Limpeza e troca de pasta térmica',
    performedBy: 'Carlos',
    performedAt: '2026-09-23T12:00:00.000Z',
    ...over,
  };
}

function planned(over: Partial<PlannedMaintenance> = {}): PlannedMaintenance {
  return {
    computerId: 3,
    computerName: 'CONTABIL-03',
    department: 'contabil',
    plannedFor: '2026-09-29T12:00:00.000Z',
    monthsSinceLast: 5,
    ...over,
  };
}

const log = {
  day: [entry({ id: 1, computerName: 'HOJE-01' })],
  week: [entry({ id: 2, computerName: 'SEMANA-02' })],
  month: [entry({ id: 3, computerName: 'MES-03' })],
};

function renderLog(props: Record<string, unknown> = {}) {
  return render(DashboardMaintenanceLog, {
    props: { data: { log, plannedToday: [], isDoneToday: false, ...(props.data ?? {}) }, ...props },
  });
}

describe('summaryOf', () => {
  // feliz
  it('says the type and what was done', () => {
    expect(summaryOf(entry())).toContain('Limpeza e troca de pasta térmica');
  });

  // triste
  /* Sem a descrição, a linha viraria só um nome de máquina e ninguém saberia o que aconteceu
     com ela. O tipo sozinho já responde. */
  it('falls back to the type alone when there is no description (edge case)', () => {
    expect(summaryOf(entry({ description: '   ' }))).not.toContain('—');
  });

  it('shows a key the catalogue does not know, raw (edge case)', () => {
    expect(summaryOf(entry({ type: 'coisa-nova', description: '' }))).toBe('coisa-nova');
  });
});

describe('performerOf', () => {
  // feliz
  it('says who did it', () => {
    expect(performerOf(entry())).toBe('por Carlos');
  });

  // triste
  /* "por " sozinho pareceria erro de digitação; dizer que ninguém foi anotado é um fato. */
  it('says nobody was written down instead of leaving a dangling word', () => {
    expect(performerOf(entry({ performedBy: null }))).toBe('sem responsável anotado');
    expect(performerOf(entry({ performedBy: '  ' }))).toBe('sem responsável anotado');
  });
});

describe('waitingOf', () => {
  // feliz
  it('says how long the machine has been waiting', () => {
    expect(waitingOf(planned({ monthsSinceLast: 5 }))).toBe('há 5 meses sem abrir');
  });

  it('writes one month in the singular', () => {
    expect(waitingOf(planned({ monthsSinceLast: 1 }))).toBe('há 1 mês sem abrir');
  });

  // triste
  /* Nunca aberta NÃO é "há 0 meses": zero diria que foi aberta hoje. */
  it('says the machine was never opened instead of zero months', () => {
    expect(waitingOf(planned({ monthsSinceLast: null }))).toBe('nunca foi aberta');
  });
});

describe('AcerolaDashboardMaintenanceLog', () => {
  // feliz
  it('starts on the week and swaps the whole list on each range', async () => {
    const user = userEvent.setup();
    renderLog();

    expect(screen.getByText('SEMANA-02')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dia' }));
    expect(screen.getByText('HOJE-01')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mês' }));
    expect(screen.getByText('MES-03')).toBeInTheDocument();
  });

  /* O plano de hoje é a única parte do bloco que pede ação, e por isso vem antes do
     histórico — histórico não se cobra. */
  it('charges for the plan of the day when it has not been done', () => {
    renderLog({ data: { log, plannedToday: [planned()], isDoneToday: false } });

    expect(screen.getByText('O plano de hoje ainda não foi feito')).toBeInTheDocument();
    expect(screen.getByText(/há 5 meses sem abrir/)).toBeInTheDocument();
  });

  it('congratulates instead of charging when the plan was already done', () => {
    renderLog({ data: { log, plannedToday: [planned()], isDoneToday: true } });

    expect(screen.getByText('A preventiva de hoje já foi feita')).toBeInTheDocument();
    expect(screen.queryByText('O plano de hoje ainda não foi feito')).not.toBeInTheDocument();
  });

  // triste
  it('shows no plan block when the plan has nothing for today', () => {
    renderLog();

    expect(screen.queryByText(/plano de hoje/)).not.toBeInTheDocument();
  });

  it('says the range has no maintenance instead of drawing an empty list', () => {
    renderLog({ data: { log: { day: [], week: [], month: [] }, plannedToday: [], isDoneToday: false } });

    expect(screen.getByText('Nenhuma manutenção registrada neste recorte.')).toBeInTheDocument();
  });

  /* Vazio só é vazio depois que a consulta terminou (CONTRIBUTING §15). */
  it('says it is reading instead of saying the range is empty (edge case)', () => {
    renderLog({
      data: { log: { day: [], week: [], month: [] }, plannedToday: [], isDoneToday: false },
      state: { isLoading: true },
    });

    expect(screen.getByText('Lendo as manutenções…')).toBeInTheDocument();
    expect(
      screen.queryByText('Nenhuma manutenção registrada neste recorte.'),
    ).not.toBeInTheDocument();
  });
});
