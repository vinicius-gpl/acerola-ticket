import { describe, expect, it } from 'vitest';

import { type MaintenanceRow } from '../../../lib/db/schema/maintenances.schema';
import { type MaintenanceWithComputer } from '../repository/maintenances.repository';
import {
  toMaintenance,
  toMaintenanceInsert,
  toMaintenanceUpdate,
} from './maintenances.mapper';

const ANA = 'ana@empresa.com.br';
const AT = '2026-09-20T12:00:00.000Z';

function maintenanceRow(overrides: Partial<MaintenanceRow> = {}): MaintenanceRow {
  return {
    id: 1,
    computerId: 3,
    otherMachine: null,
    type: 'preventive',
    description: 'Limpeza interna',
    performedBy: 'Suporte TI',
    performedAt: new Date(AT),
    createdAt: new Date('2026-09-20T13:00:00.000Z'),
    createdBy: ANA,
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function withComputer(overrides: Partial<MaintenanceRow> = {}): MaintenanceWithComputer {
  return {
    maintenance: maintenanceRow(overrides),
    computer: {
      id: 3,
      name: 'CONTABIL-03',
      displayName: 'Contábil — fechamento',
      department: 'contabil',
    },
  };
}

describe('toMaintenance', () => {
  // feliz
  it('reads the machine name from the inventory, not from a copy', () => {
    const maintenance = toMaintenance(withComputer());

    expect(maintenance.computerName).toBe('CONTABIL-03');
    expect(maintenance.computerDepartment).toBe('contabil');
    expect(maintenance.performedAt).toBe(AT);
  });

  // triste
  /* Equipamento de fora do inventário não tem máquina para ler — e isso não é falta de
     dado, é a outra forma legítima de registrar um serviço. */
  it('leaves the machine empty for equipment that is not in the inventory', () => {
    const maintenance = toMaintenance({
      maintenance: maintenanceRow({ computerId: null, otherMachine: 'Impressora da recepção' }),
      computer: null,
    });

    expect(maintenance.computerName).toBeNull();
    expect(maintenance.otherMachine).toBe('Impressora da recepção');
  });
});

describe('toMaintenanceInsert', () => {
  // feliz
  it('stamps the author from the identity', () => {
    const insert = toMaintenanceInsert({ computerId: 3, type: 'preventive', performedAt: AT }, ANA);

    expect(insert.createdBy).toBe(ANA);
    expect(insert.performedAt).toEqual(new Date(AT));
  });

  // triste
  /* Guardar os dois deixaria a linha dizendo duas coisas diferentes sobre o mesmo serviço. */
  it('drops the hand-typed equipment when a machine was chosen', () => {
    const insert = toMaintenanceInsert(
      { computerId: 3, otherMachine: 'Impressora', type: 'cleaning', performedAt: AT },
      ANA,
    );

    expect(insert.otherMachine).toBeNull();
  });

  it('never takes the author from the body', () => {
    const insert = toMaintenanceInsert(
      { computerId: 3, type: 'preventive', performedAt: AT, createdBy: 'bia@empresa.com.br' } as never,
      ANA,
    );

    expect(insert.createdBy).toBe(ANA);
  });
});

describe('toMaintenanceUpdate', () => {
  // feliz
  it('touches only what came in the body', () => {
    const update = toMaintenanceUpdate({ description: 'Troquei o SSD' }, ANA);

    expect(update.description).toBe('Troquei o SSD');
    expect(update).not.toHaveProperty('type');
    expect(update).not.toHaveProperty('performedAt');
    expect(update.updatedBy).toBe(ANA);
  });

  it('moves the record to a machine, releasing the hand-typed equipment', () => {
    const update = toMaintenanceUpdate({ computerId: 5 }, ANA);

    expect(update.computerId).toBe(5);
    expect(update.otherMachine).toBeNull();
  });

  // triste
  /* Campo ausente é "não mexi nisso"; campo nulo é "limpe isto". Tratar os dois como iguais
     apagaria o que foi escrito por quem só queria corrigir a data. */
  it('clears a field only when it was explicitly sent empty', () => {
    expect(toMaintenanceUpdate({ description: null }, ANA).description).toBeNull();
    expect(toMaintenanceUpdate({}, ANA)).not.toHaveProperty('description');
  });
});
