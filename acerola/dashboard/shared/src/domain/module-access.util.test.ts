import { describe, expect, it } from 'vitest';

import { hasModule, modulesOf } from './module-access.util';

const gestorDeInfra = { role: 'manager', roles: { infra: 'manager' } };

describe('hasModule', () => {
  // feliz
  it('opens the modules released for the person, and only those', () => {
    expect(hasModule(gestorDeInfra, 'infra')).toBe(true);
    expect(hasModule(gestorDeInfra, 'sistema')).toBe(false);
  });

  it('opens every module to the super-admin, with no row at all', () => {
    expect(modulesOf({ role: 'superadmin', roles: {} })).toEqual(['infra', 'sistema', 'manutencao']);
  });

  // triste
  /* Sem linha é sem acesso: o padrão "user" dava leitura de tudo a qualquer conta. */
  it('gives nothing to who has no module, whatever the main role', () => {
    expect(hasModule({ role: 'admin', roles: {} }, 'infra')).toBe(false);
    expect(hasModule({ role: 'user' }, 'manutencao')).toBe(false);
    expect(hasModule(null, 'infra')).toBe(false);
    expect(modulesOf({ role: 'user', roles: {} })).toEqual([]);
  });
});
