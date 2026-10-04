import { describe, expect, it } from 'vitest';

import {
  availableTicketHistoryTypes,
  isClosingTicketHistoryType,
  isSystemTicketHistoryType,
  MANUAL_TICKET_HISTORY_TYPES,
  nextTicketStatus,
  refuseTicketHistory,
  TICKET_HISTORY_TYPE_LABELS,
  TICKET_HISTORY_TYPES,
  ticketHistoryTone,
  ticketHistoryTypeLabel,
} from './ticket-history.util';
import { isClosedTicketStatus } from './ticket-status.util';

describe('ticket history vocabulary', () => {
  // feliz
  it('names every history type in Portuguese and gives each one a tone', () => {
    for (const type of TICKET_HISTORY_TYPES) {
      expect(TICKET_HISTORY_TYPE_LABELS[type]).toBeTruthy();
      expect(ticketHistoryTone(type)).toBeTruthy();
    }

    expect(ticketHistoryTypeLabel('closure_with_caveats')).toBe('Encerramento com ressalva');
  });

  it('keeps the system types out of what a person can choose', () => {
    expect(isSystemTicketHistoryType('opening')).toBe(true);
    expect(isSystemTicketHistoryType('update')).toBe(true);
    expect(MANUAL_TICKET_HISTORY_TYPES).not.toContain('opening');
    expect(MANUAL_TICKET_HISTORY_TYPES).not.toContain('update');
  });
});

describe('nextTicketStatus', () => {
  // feliz
  it('moves the ticket to the stage each type leads to', () => {
    expect(nextTicketStatus('open', 'start')).toBe('in_progress');
    expect(nextTicketStatus('in_progress', 'waiting_requester')).toBe('waiting_requester');
    expect(nextTicketStatus('in_progress', 'waiting_third_party')).toBe('waiting_third_party');
    expect(nextTicketStatus('waiting_requester', 'resume')).toBe('in_progress');
    expect(nextTicketStatus('in_progress', 'resolution')).toBe('resolved');
    expect(nextTicketStatus('in_progress', 'closure_with_caveats')).toBe('resolved_with_caveats');
    expect(nextTicketStatus('open', 'cancellation')).toBe('cancelled');
    expect(nextTicketStatus('resolved', 'reopening')).toBe('in_progress');
  });

  it('every closing type leaves the ticket in a closed stage', () => {
    for (const type of TICKET_HISTORY_TYPES.filter(isClosingTicketHistoryType)) {
      expect(isClosedTicketStatus(nextTicketStatus('in_progress', type))).toBe(true);
    }
  });

  // triste
  /* Um andamento ou uma alteração de dados só acrescentam à linha do tempo. */
  it('keeps the stage for the types that only add to the timeline', () => {
    expect(nextTicketStatus('waiting_third_party', 'note')).toBe('waiting_third_party');
    expect(nextTicketStatus('open', 'note')).toBe('open');
    expect(nextTicketStatus('in_progress', 'update')).toBe('in_progress');
  });
});

describe('refuseTicketHistory', () => {
  // feliz
  it('lets the work flow: start, wait, resume, solve', () => {
    expect(refuseTicketHistory('open', 'start')).toBeNull();
    expect(refuseTicketHistory('in_progress', 'waiting_third_party')).toBeNull();
    expect(refuseTicketHistory('waiting_third_party', 'resume')).toBeNull();
    expect(refuseTicketHistory('in_progress', 'resolution')).toBeNull();
    expect(refuseTicketHistory('in_progress', 'closure_with_caveats')).toBeNull();
  });

  /* Resolver ou cancelar direto de "aberto" é normal: problema que se resolve na hora. */
  it('lets a ticket be solved or cancelled without a formal start', () => {
    expect(refuseTicketHistory('open', 'resolution')).toBeNull();
    expect(refuseTicketHistory('open', 'cancellation')).toBeNull();
    expect(refuseTicketHistory('open', 'note')).toBeNull();
  });

  it('lets a closed ticket be reopened, from any closing stage', () => {
    expect(refuseTicketHistory('resolved', 'reopening')).toBeNull();
    expect(refuseTicketHistory('resolved_with_caveats', 'reopening')).toBeNull();
    expect(refuseTicketHistory('cancelled', 'reopening')).toBeNull();
  });

  // triste
  it('refuses anything but a reopening on a closed ticket', () => {
    expect(refuseTicketHistory('resolved', 'note')).toMatch(/encerrado/);
    expect(refuseTicketHistory('cancelled', 'resolution')).toMatch(/Reabra/);
    expect(refuseTicketHistory('resolved_with_caveats', 'start')).toMatch(/encerrado/);
  });

  it('refuses a reopening on a ticket that is still running', () => {
    expect(refuseTicketHistory('in_progress', 'reopening')).toMatch(/já foi encerrado/);
    expect(refuseTicketHistory('open', 'reopening')).not.toBeNull();
  });

  it('refuses a second start and a resume of what is not waiting', () => {
    expect(refuseTicketHistory('in_progress', 'start')).toMatch(/já foi iniciado/);
    expect(refuseTicketHistory('in_progress', 'resume')).toMatch(/aguardando/);
    expect(refuseTicketHistory('open', 'resume')).not.toBeNull();
  });

  /* Abertura e alteração de dados são do sistema: aceitá-las do formulário deixaria alguém
     "abrir" o chamado pela segunda vez. */
  it('refuses the system types whatever the stage', () => {
    expect(refuseTicketHistory('open', 'opening')).toMatch(/sistema/);
    expect(refuseTicketHistory('in_progress', 'update')).toMatch(/sistema/);
  });
});

describe('availableTicketHistoryTypes', () => {
  // feliz
  it('offers the start on a fresh ticket, and never again after it', () => {
    expect(availableTicketHistoryTypes('open')).toContain('start');
    expect(availableTicketHistoryTypes('in_progress')).not.toContain('start');
  });

  it('offers the resume only while the ticket waits', () => {
    expect(availableTicketHistoryTypes('waiting_requester')).toContain('resume');
    expect(availableTicketHistoryTypes('in_progress')).not.toContain('resume');
  });

  // triste
  it('offers only the reopening on a closed ticket', () => {
    expect(availableTicketHistoryTypes('resolved')).toEqual(['reopening']);
    expect(availableTicketHistoryTypes('cancelled')).toEqual(['reopening']);
  });
});
