import { describe, expect, it } from 'vitest';

import { isRoleContext, roleContextLabel, roleContextOptions } from './role-context.util';

describe('roleContextLabel', () => {
  // feliz
  it('translates each context to a Portuguese label', () => {
    expect(roleContextLabel('infra')).toBe('Infraestrutura');
    expect(roleContextLabel('sistema')).toBe('Sistema');
    expect(roleContextLabel('manutencao')).toBe('Manutenção');
  });
});

describe('isRoleContext', () => {
  // feliz
  it('accepts the three known contexts', () => {
    expect(isRoleContext('infra')).toBe(true);
    expect(isRoleContext('manutencao')).toBe(true);
  });

  // triste
  it('refuses anything outside the list', () => {
    expect(isRoleContext('financeiro')).toBe(false);
    expect(isRoleContext(null)).toBe(false);
  });
});

describe('roleContextOptions', () => {
  // feliz
  it('pairs every context with its label, for a select', () => {
    expect(roleContextOptions()).toEqual([
      { value: 'infra', label: 'Infraestrutura' },
      { value: 'sistema', label: 'Sistema' },
      { value: 'manutencao', label: 'Manutenção' },
    ]);
  });
});
