import { describe, expect, it } from 'vitest';

import {
  identifyPerson,
  maskEmail,
  nameMatches,
  personOptionsText,
  pickPerson,
  type PersonCandidate,
} from './person-match.util';

const ANA_SOUZA: PersonCandidate = {
  id: 'a1',
  name: 'Ana Souza',
  email: 'ana.souza@empresa.com.br',
};
const ANA_LIMA: PersonCandidate = { id: 'a2', name: 'Ana Lima', email: 'ana.lima@empresa.com.br' };
const JOAO: PersonCandidate = { id: 'j1', name: 'João da Silva', email: 'joao@empresa.com.br' };
const PEOPLE = [ANA_SOUZA, ANA_LIMA, JOAO];

describe('nameMatches', () => {
  // feliz
  it('ignores accents, case, connectors and accepts the start of a name', () => {
    expect(nameMatches('joao silva', 'João da Silva')).toBe(true);
    expect(nameMatches('Ana Sou', 'Ana Souza')).toBe(true);
  });

  // triste
  it('refuses a name with a part that is not there', () => {
    expect(nameMatches('Ana Pereira', 'Ana Souza')).toBe(false);
    expect(nameMatches('', 'Ana Souza')).toBe(false);
  });

  /* Duas letras não bastam como começo: "An" acharia meio escritório. */
  it('refuses a too short start of a name', () => {
    expect(nameMatches('An Souza', 'Ana Souza')).toBe(false);
  });
});

describe('identifyPerson', () => {
  // feliz
  it('finds the only person with that name', () => {
    expect(identifyPerson('Ana Souza', PEOPLE, [])).toEqual({ kind: 'one', person: ANA_SOUZA });
  });

  it('settles a shared name by who already used that phone', () => {
    expect(identifyPerson('Ana', PEOPLE, ['a2'])).toEqual({ kind: 'one', person: ANA_LIMA });
  });

  it('asks who is who when several people share the name, phone owners first', () => {
    expect(identifyPerson('ana', PEOPLE, [])).toEqual({
      kind: 'many',
      people: [ANA_SOUZA, ANA_LIMA],
    });
  });

  // triste
  it('finds nobody when no name matches', () => {
    expect(identifyPerson('Carla Dias', PEOPLE, ['a1'])).toEqual({ kind: 'none' });
  });

  /* O telefone só desempata entre nomes que batem: ele nunca troca a pessoa por outra. */
  it('does not pick the phone owner when their name does not match', () => {
    expect(identifyPerson('João', PEOPLE, ['a1'])).toEqual({ kind: 'one', person: JOAO });
  });
});

describe('pickPerson', () => {
  // feliz
  it('picks by the number of the list, or by a name that tells them apart', () => {
    expect(pickPerson('2', [ANA_SOUZA, ANA_LIMA])).toBe(ANA_LIMA);
    expect(pickPerson('ana lima', [ANA_SOUZA, ANA_LIMA])).toBe(ANA_LIMA);
    expect(pickPerson('0', [ANA_SOUZA, ANA_LIMA])).toBe('none');
  });

  // triste
  it('does not understand a number out of the list or an ambiguous name', () => {
    expect(pickPerson('3', [ANA_SOUZA, ANA_LIMA])).toBeNull();
    expect(pickPerson('ana', [ANA_SOUZA, ANA_LIMA])).toBeNull();
  });
});

describe('personOptionsText', () => {
  // feliz
  it('lists people with a masked e-mail and the way out', () => {
    expect(personOptionsText([ANA_SOUZA])).toBe(
      '1. Ana Souza (an***@empresa.com.br)\n0. Nenhum desses',
    );
  });

  // triste
  it('masks an e-mail even when the name before the @ is short', () => {
    expect(maskEmail('a@empresa.com.br')).toBe('a***@empresa.com.br');
  });
});
