import { describe, expect, it } from 'vitest';

import {
  availableTicketHistoryTypes,
  CLOSING_TICKET_HISTORY_TYPES,
  isClosingTicketHistoryType,
  isSystemTicketHistoryType,
  MANUAL_TICKET_HISTORY_TYPES,
  nextTicketStatus,
  refuseTicketHistory,
  SYSTEM_TICKET_HISTORY_TYPES,
  TICKET_HISTORY_CATALOG,
  TICKET_HISTORY_TYPE_LABELS,
  TICKET_HISTORY_TYPES,
  ticketHistoryEffect,
  ticketHistoryEffectLabel,
  ticketHistoryTone,
  ticketHistoryTypeGroups,
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

describe('TICKET_HISTORY_CATALOG', () => {
  // feliz
  /* A lista escrita (que o schema Zod usa como tipo) e o catálogo têm de dizer a mesma coisa:
     um tipo novo esquecido numa das duas reprova aqui, não some calado do formulário. */
  it('lists as manual exactly the types a person launches', () => {
    const launchedByPerson = TICKET_HISTORY_TYPES.filter(
      (type) => TICKET_HISTORY_CATALOG[type].origin === 'person',
    );

    expect([...MANUAL_TICKET_HISTORY_TYPES].sort()).toEqual([...launchedByPerson].sort());
    expect(SYSTEM_TICKET_HISTORY_TYPES).toEqual(['opening', 'update']);
  });

  /* "Encerra" não é uma marca da ficha: é levar o chamado para um estágio encerrado. */
  it('closes the ticket exactly with the types that lead to a closed stage', () => {
    expect(CLOSING_TICKET_HISTORY_TYPES).toEqual(['resolution', 'closure_with_caveats', 'cancellation']);

    for (const type of TICKET_HISTORY_TYPES) {
      const leadsTo = TICKET_HISTORY_CATALOG[type].leadsTo;

      expect(isClosingTicketHistoryType(type), type).toBe(
        leadsTo !== null && isClosedTicketStatus(leadsTo),
      );
    }
  });

  it('gives every type a refusal sentence, and a moment to every type a person launches', () => {
    for (const type of TICKET_HISTORY_TYPES) {
      expect(TICKET_HISTORY_CATALOG[type].refusal).toBeTruthy();
    }

    for (const type of MANUAL_TICKET_HISTORY_TYPES) {
      expect(TICKET_HISTORY_CATALOG[type].allowedIn.length, type).toBeGreaterThan(0);
    }
  });

  // triste
  /* Um tipo que encerra e pudesse ser lançado num chamado encerrado encerraria duas vezes. */
  it('never lets a closing type be launched on a ticket that is already closed', () => {
    for (const type of CLOSING_TICKET_HISTORY_TYPES) {
      expect(TICKET_HISTORY_CATALOG[type].allowedIn, type).not.toContain('closed');
    }
  });
});

describe('ticketHistoryEffect', () => {
  // feliz
  it('tells apart what closes, what moves the stage and what only adds to the timeline', () => {
    expect(ticketHistoryEffect('resolution')).toBe('closes');
    expect(ticketHistoryEffect('cancellation')).toBe('closes');
    expect(ticketHistoryEffect('waiting_requester')).toBe('moves');
    expect(ticketHistoryEffect('reopening')).toBe('moves');
    expect(ticketHistoryEffect('note')).toBe('keeps');
  });

  it('says in one sentence what the history will do to the ticket', () => {
    expect(ticketHistoryEffectLabel('closure_with_caveats')).toBe(
      'Encerra o chamado. Ele sai da fila como "Encerrado com ressalva".',
    );
    expect(ticketHistoryEffectLabel('start')).toBe(
      'Muda o estágio do chamado para "Em atendimento".',
    );
  });

  // triste
  it('does not announce a closing for a history that only adds to the timeline', () => {
    expect(ticketHistoryEffectLabel('note')).not.toMatch(/Encerra/);
    expect(ticketHistoryEffectLabel('note')).toMatch(/Não muda o estágio/);
  });
});

describe('ticketHistoryTypeGroups', () => {
  // feliz
  it('separates what keeps the ticket running from what closes it', () => {
    const groups = ticketHistoryTypeGroups('in_progress');

    expect(groups.continuing).toEqual(['note', 'waiting_requester', 'waiting_third_party']);
    expect(groups.closing).toEqual(['resolution', 'closure_with_caveats', 'cancellation']);
  });

  // triste
  it('offers nothing that closes on a ticket that is already closed', () => {
    expect(ticketHistoryTypeGroups('resolved')).toEqual({ continuing: ['reopening'], closing: [] });
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
