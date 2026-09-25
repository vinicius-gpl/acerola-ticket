import { seedComputers } from './computers/seed-computers';
import { seedMaintenances } from './maintenances/seed-maintenances';
import { seedNetwork } from './network/seed-network';
import { seedParts } from './parts/seed-parts';
import { openSeedDatabase, report, resetDatabase } from './seed.util';
import { seedTasks } from './tasks/seed-tasks';
import { seedTickets } from './tickets/seed-tickets';
import { seedTransfers } from './transfers/seed-transfers';

/**
 * Todos os seeds, NA ORDEM DE DEPENDÊNCIA.
 *
 * Quem é referenciado vem antes de quem referencia: se `comentarios` aponta para `tarefas`,
 * `seedTasks` roda primeiro — senão a chave estrangeira recusa a linha. Seed novo entra nesta
 * lista, no lugar certo da ordem.
 *
 *   npm run seed:all   → grava por cima do que existe (idempotente)
 *   npm run db:reset   → ESVAZIA as tabelas e grava tudo do zero
 */
async function main(): Promise<void> {
  if (process.argv.includes('--reset')) {
    await resetDatabase();
    console.log('Tabelas esvaziadas. Recriando do zero…');
  }

  const { db, close } = await openSeedDatabase();

  try {
    report('tarefas', await seedTasks(db));
    report('chamados', await seedTickets(db));
    report('computadores', await seedComputers(db));
    /* Depois dos computadores: a manutenção aponta para a máquina. */
    report('manutenções', await seedMaintenances(db));
    /* Depois dos computadores também: a movimentação aponta para a máquina que recebeu. */
    report('peças do depósito', await seedParts(db));
    /* Depois dos computadores: o histórico aponta para a máquina que mudou de setor. */
    report('transferências', await seedTransfers(db));
    /* A rede não depende de ninguém: é o link de internet, não uma máquina. */
    report('eventos de rede', await seedNetwork(db));
  } finally {
    await close();
  }

  console.log('Seeds concluídos.');
}

void main();
