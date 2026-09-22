import { describe, expect, it } from 'vitest';

import {
  DEPARTMENT_LABELS,
  DEPARTMENTS,
  departmentLabel,
  departmentOptions,
  isDepartment,
} from './department.util';
import { TICKET_DEPARTMENTS, ticketDepartmentLabel } from './ticket-catalog.util';

describe('DEPARTMENT_LABELS', () => {
  it('has a screen label for every department', () => {
    for (const department of DEPARTMENTS) {
      expect(DEPARTMENT_LABELS[department]).toBeTruthy();
    }
  });
});

describe('departmentLabel', () => {
  // feliz
  it('gives the name the company actually uses', () => {
    expect(departmentLabel('contabil')).toBe('CONTÁBIL');
    expect(departmentLabel('rh')).toBe('RH');
  });
});

describe('isDepartment', () => {
  // feliz
  it('accepts a known department', () => {
    expect(isDepartment('financeiro')).toBe(true);
  });

  // triste
  it('refuses the screen label, which is not the stored value', () => {
    expect(isDepartment('FINANCEIRO')).toBe(false);
  });

  it('refuses a department that does not exist', () => {
    expect(isDepartment('marketing')).toBe(false);
  });

  it('refuses anything that is not a string', () => {
    expect(isDepartment(null)).toBe(false);
    expect(isDepartment(7)).toBe(false);
  });
});

describe('departmentOptions', () => {
  // feliz
  it('pairs every value with its label, in list order', () => {
    const options = departmentOptions();

    expect(options).toHaveLength(DEPARTMENTS.length);
    expect(options[0]).toEqual({ value: 'analyze', label: 'ANALYZE' });
  });
});

/**
 * A razão de a lista ter saído da feature de chamados: chamado e computador precisam do MESMO
 * cadastro. Duas cópias divergiriam na primeira reorganização da empresa, e os indicadores que
 * cruzam as duas somariam departamentos diferentes como se fossem o mesmo.
 */
describe('departments shared with tickets', () => {
  // feliz
  it('is the same list the ticket contract uses', () => {
    expect(TICKET_DEPARTMENTS).toBe(DEPARTMENTS);
  });

  it('is the same label, read from either side', () => {
    expect(ticketDepartmentLabel('recepcao')).toBe(departmentLabel('recepcao'));
  });
});
