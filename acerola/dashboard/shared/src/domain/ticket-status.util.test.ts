import { describe, expect, it } from 'vitest';

import {
  CLOSED_TICKET_STATUSES,
  isClosedTicketStatus,
  isSolvedTicketStatus,
  isTicketStatus,
  isWaitingTicketStatus,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUSES,
  ticketPriorityTone,
  ticketStatusTone,
} from './ticket-status.util';

describe('TICKET_STATUS_LABELS', () => {
  it('has a screen label for every status', () => {
    for (const status of TICKET_STATUSES) {
      expect(TICKET_STATUS_LABELS[status]).toBeTruthy();
    }
  });
});

describe('TICKET_PRIORITY_LABELS', () => {
  it('has a screen label for every priority', () => {
    for (const priority of TICKET_PRIORITIES) {
      expect(TICKET_PRIORITY_LABELS[priority]).toBeTruthy();
    }
  });
});

describe('ticketStatusTone', () => {
  // feliz
  it('paints a resolved ticket as success', () => {
    expect(ticketStatusTone('resolved')).toBe('success');
  });

  it('paints a ticket nobody picked up yet as danger, so it stands out in the queue', () => {
    expect(ticketStatusTone('open')).toBe('danger');
  });

  /* São sete estágios e cinco tons: não dá para um por estágio. O que não pode se confundir de
     relance são os quatro momentos do chamado — parado na fila, na mão do TI, resolvido e
     cancelado. */
  it('tells the four moments of a ticket apart at a glance', () => {
    const tones = (['open', 'in_progress', 'resolved', 'cancelled'] as const).map(ticketStatusTone);

    expect(new Set(tones).size).toBe(4);
  });

  /* Esperando alguém, ou encerrado com algo por fazer: os três pedem atenção, e têm o mesmo
     tom de aviso. */
  it('paints with the warning tone everything that still asks for attention', () => {
    expect(ticketStatusTone('waiting_requester')).toBe('warning');
    expect(ticketStatusTone('waiting_third_party')).toBe('warning');
    expect(ticketStatusTone('resolved_with_caveats')).toBe('warning');
  });

  it('has a tone for every stage', () => {
    for (const status of TICKET_STATUSES) expect(ticketStatusTone(status)).toBeTruthy();
  });
});

describe('ticket stage groups', () => {
  // feliz
  it('counts the closure with caveats as closed and as solved', () => {
    expect(isClosedTicketStatus('resolved_with_caveats')).toBe(true);
    expect(isSolvedTicketStatus('resolved_with_caveats')).toBe(true);
    expect(isSolvedTicketStatus('resolved')).toBe(true);
  });

  it('knows the stages where the ticket is stopped waiting for someone', () => {
    expect(isWaitingTicketStatus('waiting_requester')).toBe(true);
    expect(isWaitingTicketStatus('waiting_third_party')).toBe(true);
  });

  // triste
  /* Cancelado encerra, mas não resolve: não entra no indicador de resolvidos. */
  it('does not count a cancelled ticket as solved, nor a running one as waiting', () => {
    expect(isClosedTicketStatus('cancelled')).toBe(true);
    expect(isSolvedTicketStatus('cancelled')).toBe(false);
    expect(isWaitingTicketStatus('in_progress')).toBe(false);
    expect(isClosedTicketStatus('waiting_requester')).toBe(false);
  });
});

describe('ticketPriorityTone', () => {
  // feliz
  it('paints high urgency as danger', () => {
    expect(ticketPriorityTone('high')).toBe('danger');
  });

  it('gives each priority its own tone', () => {
    const tones = TICKET_PRIORITIES.map(ticketPriorityTone);

    expect(new Set(tones).size).toBe(TICKET_PRIORITIES.length);
  });
});

describe('isTicketStatus', () => {
  // feliz
  it('accepts a known status', () => {
    expect(isTicketStatus('in_progress')).toBe(true);
  });

  // triste
  it('refuses the screen label, which is not the stored value', () => {
    expect(isTicketStatus('Em atendimento')).toBe(false);
  });

  it('refuses anything that is not a string', () => {
    expect(isTicketStatus(null)).toBe(false);
    expect(isTicketStatus(3)).toBe(false);
  });
});

describe('isClosedTicketStatus', () => {
  // feliz
  it('treats resolved and cancelled as off the queue', () => {
    expect(isClosedTicketStatus('resolved')).toBe(true);
    expect(isClosedTicketStatus('cancelled')).toBe(true);
  });

  // triste
  it('keeps an open ticket on the queue', () => {
    expect(isClosedTicketStatus('open')).toBe(false);
  });

  it('keeps a ticket being worked on right now on the queue', () => {
    expect(isClosedTicketStatus('in_progress')).toBe(false);
  });

  it('never closes every status, otherwise the queue would always look empty', () => {
    expect(CLOSED_TICKET_STATUSES.length).toBeLessThan(TICKET_STATUSES.length);
  });
});
