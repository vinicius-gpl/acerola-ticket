import { openSeedDatabase, report, resetDatabase } from './seed.util';
import { seedTasks } from './tasks/seed-tasks';
import { seedTickets } from './tickets/seed-tickets';

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
  } finally {
    await close();
  }

  console.log('Seeds concluídos.');
}

void main();
