import { describe, expect, it } from 'vitest';

import {
  isTicketProblemTypeForArea,
  TICKET_PROBLEM_TYPES,
  ticketAreaOptions,
  ticketProblemTypeOptionsForArea,
  ticketProblemTypesForArea,
} from './ticket-catalog.util';

describe('ticketAreaOptions', () => {
  // feliz
  it('lists the three areas with a Portuguese label', () => {
    expect(ticketAreaOptions()).toEqual([
      { value: 'infra', label: 'Infraestrutura' },
      { value: 'sistema', label: 'Sistema' },
      { value: 'manutencao', label: 'Manutenção' },
    ]);
  });
});

describe('ticketProblemTypesForArea', () => {
  // feliz
  it('keeps infra on the same catalog it always had', () => {
    expect(ticketProblemTypesForArea('infra')).toContain('printer');
    expect(ticketProblemTypesForArea('infra')).toContain('network');
  });

  it('gives sistema its own, shorter catalog', () => {
    expect(ticketProblemTypesForArea('sistema')).toContain('bug');
    expect(ticketProblemTypesForArea('sistema')).not.toContain('printer');
  });

  it('gives manutencao its own catalog, about the building', () => {
    expect(ticketProblemTypesForArea('manutencao')).toContain('air_conditioning');
    expect(ticketProblemTypesForArea('manutencao')).not.toContain('bug');
  });
});

describe('TICKET_PROBLEM_TYPES', () => {
  // feliz
  it('is the union of every area, with no duplicates', () => {
    expect(TICKET_PROBLEM_TYPES).toContain('printer');
    expect(TICKET_PROBLEM_TYPES).toContain('bug');
    expect(TICKET_PROBLEM_TYPES).toContain('air_conditioning');
    /* "other" existe nas três áreas — a união não pode repeti-lo. */
    expect(TICKET_PROBLEM_TYPES.filter((type) => type === 'other')).toHaveLength(1);
  });
});

describe('isTicketProblemTypeForArea', () => {
  // feliz
  it('accepts a type that belongs to the area', () => {
    expect(isTicketProblemTypeForArea('manutencao', 'air_conditioning')).toBe(true);
  });

  // triste
  it('refuses a type that exists, but on another area', () => {
    expect(isTicketProblemTypeForArea('manutencao', 'printer')).toBe(false);
  });

  it('refuses a value that does not exist anywhere', () => {
    expect(isTicketProblemTypeForArea('infra', 'ovni')).toBe(false);
  });
});

describe('ticketProblemTypeOptionsForArea', () => {
  // feliz
  it('pairs each type of the area with its Portuguese label', () => {
    const options = ticketProblemTypeOptionsForArea('manutencao');

    expect(options).toContainEqual({ value: 'air_conditioning', label: 'Ar-condicionado' });
  });
});
