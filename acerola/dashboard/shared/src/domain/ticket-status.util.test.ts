import { describe, expect, it } from 'vitest';

import {
  CLOSED_TICKET_STATUSES,
  isClosedTicketStatus,
  isTicketStatus,
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

  it('gives each status its own tone, so they can be told apart at a glance', () => {
    const tones = TICKET_STATUSES.map(ticketStatusTone);

    expect(new Set(tones).size).toBe(TICKET_STATUSES.length);
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
