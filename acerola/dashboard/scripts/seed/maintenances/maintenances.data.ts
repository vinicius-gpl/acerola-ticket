import { type MaintenanceInsert } from '../../../server/src/lib/db/schema/maintenances.schema';

/**
 * Os dados de teste do histórico de manutenção. VERSIONADOS: toda máquina que rodar o seed
 * vê isto.
 *
 * Serviços INVENTADOS, em máquinas inventadas (as do seed do inventário, ids 1 a 8). Nome de
 * técnico de verdade não entra aqui — este arquivo vai para o git e fica no histórico.
 *
 * O conjunto é escolhido para a tela nascer mostrando TODOS os casos da régua de preventiva:
 * uma máquina em dia, uma vencida, uma que nunca foi aberta, uma que só teve limpeza (que
 * NÃO zera o relógio) e uma que já deu trabalho três vezes.
 */
const TI = 'suporte@azuos.local';

/**
 * As datas são RELATIVAS ao momento do seed, como as do inventário.
 *
 * A régua da preventiva é "faz mais de três meses?", então data fixa faria o seed nascer com
 * todo o parque vencido alguns meses depois do commit — e a tela contaria uma história que
 * não é a que ela deveria demonstrar. Os `id` continuam fixos, que é o que torna o seed
 * idempotente.
 */
const NOW = Date.now();

const DAY = 24 * 60 * 60 * 1000;

const daysAgo = (days: number) => new Date(NOW - days * DAY);

export const MAINTENANCES_SEED: MaintenanceInsert[] = [
  /* RECEPCAO-01: preventiva recente — a máquina em dia, a referência das outras. */
  {
    id: 1,
    computerId: 1,
    type: 'preventive',
    description: 'Limpeza interna, troca da pasta térmica e verificação dos cabos.',
    performedBy: 'Suporte TI',
    performedAt: daysAgo(20),
    createdAt: daysAgo(20),
    createdBy: TI,
  },

  /* FINANCEIRO-02: três registros, e o último que conta é de cinco meses atrás. É a máquina
     vencida E a que já deu trabalho demais — as duas pontas da tela ao mesmo tempo. */
  {
    id: 2,
    computerId: 2,
    type: 'corrective',
    description: 'Máquina não ligava: fonte substituída.',
    performedBy: 'Suporte TI',
    performedAt: daysAgo(150),
    createdAt: daysAgo(150),
    createdBy: TI,
  },
  {
    id: 3,
    computerId: 2,
    type: 'part_replacement',
    description: 'Disco rígido trocado por SSD de 480 GB.',
    performedBy: 'Suporte TI',
    performedAt: daysAgo(95),
    createdAt: daysAgo(95),
    createdBy: TI,
  },
  {
    id: 4,
    computerId: 2,
    type: 'reinstall',
    description: 'Windows reinstalado depois da troca do disco.',
    performedBy: 'Suporte TI',
    performedAt: daysAgo(94),
    createdAt: daysAgo(94),
    createdBy: TI,
  },

  /* CONTABIL-03: corretiva recente. Corretiva zera o relógio da preventiva — quem abriu a
     máquina para consertar fez a mesma limpeza. */
  {
    id: 5,
    computerId: 3,
    type: 'corrective',
    description: 'Máquina desligando sozinha: cooler do processador substituído.',
    performedBy: 'Carlos (assistência externa)',
    performedAt: daysAgo(35),
    createdAt: daysAgo(35),
    createdBy: TI,
  },

  /* PARALEGAL-08: CASO LIMITE da régua. Teve limpeza há pouco tempo, mas limpeza não conta
     como preventiva — a tela precisa continuar cobrando esta máquina. */
  {
    id: 6,
    computerId: 8,
    type: 'cleaning',
    description: 'Limpeza externa do gabinete e do teclado.',
    performedBy: 'Equipe de limpeza',
    performedAt: daysAgo(25),
    createdAt: daysAgo(25),
    createdBy: TI,
  },

  /* CASO LIMITE: equipamento que NÃO está no inventário. Sem esta saída, o técnico lançaria
     o serviço numa máquina errada só para conseguir salvar. */
  {
    id: 7,
    computerId: null,
    otherMachine: 'Impressora da recepção (Brother DCP-L2540)',
    type: 'corrective',
    description: 'Atolamento de papel: rolete de tração limpo e mola recolocada.',
    performedBy: 'Suporte TI',
    performedAt: daysAgo(12),
    createdAt: daysAgo(12),
    createdBy: TI,
  },

  /* Registro sem descrição e sem responsável: o que sobra quando alguém lança correndo. A
     tela precisa aguentar isso sem ficar com buraco. */
  {
    id: 8,
    computerId: 6,
    type: 'other',
    performedAt: daysAgo(60),
    createdAt: daysAgo(60),
    createdBy: TI,
  },
];
