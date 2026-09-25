import { type ComputerTransferInsert } from '../../../server/src/lib/db/schema/computer-transfers.schema';

/**
 * O histórico de transferências de teste. VERSIONADO: toda máquina que rodar o seed vê isto.
 *
 * Mudanças INVENTADAS, nas máquinas inventadas do seed do inventário (ids 1 a 8). Nome de
 * pessoa de verdade não entra aqui — este arquivo vai para o git e fica no histórico.
 *
 * Cada linha CONFERE com o departamento em que a máquina está hoje no seed do inventário: um
 * histórico que termina em outro lugar diferente do atual é exatamente o tipo de dado de
 * teste que faz alguém duvidar da tela em vez de duvidar do seed.
 *
 * O conjunto mostra os casos que a ficha precisa saber contar: a mudança de um setor para
 * outro, a máquina que saiu da prateleira para um setor (origem nula) e uma mudança que
 * deixou periférico para trás.
 */
const TI = 'suporte@azuos.local';

/** As datas são RELATIVAS ao seed, como no resto: histórico velho demais some do contexto. */
const NOW = Date.now();

const DAY = 24 * 60 * 60 * 1000;

const daysAgo = (days: number) => new Date(NOW - days * DAY);

export const TRANSFERS_SEED: ComputerTransferInsert[] = [
  {
    id: 1,
    computerId: 3,
    fromDepartment: 'recepcao',
    toDepartment: 'contabil',
    responsible: 'Coordenação contábil',
    note: 'Máquina passou para a contabilidade quando a recepção recebeu a nova. O teclado e o mouse ficaram no balcão.',
    peripheralsLeftBehind: 1,
    createdAt: daysAgo(120),
    createdBy: TI,
  },
  {
    id: 2,
    computerId: 5,
    fromDepartment: null,
    toDepartment: 'comercial',
    responsible: 'Liderança comercial',
    note: 'Saiu da reserva para o notebook de visita do comercial.',
    peripheralsLeftBehind: 0,
    createdAt: daysAgo(40),
    createdBy: TI,
  },
  {
    id: 3,
    computerId: 7,
    fromDepartment: 'financeiro',
    toDepartment: 'rh',
    responsible: 'Coordenação de RH',
    note: 'Desktop antigo passou para o RH depois da troca da máquina do financeiro.',
    peripheralsLeftBehind: 0,
    createdAt: daysAgo(18),
    createdBy: TI,
  },
];
