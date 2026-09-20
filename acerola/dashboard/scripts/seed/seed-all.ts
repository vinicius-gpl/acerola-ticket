import { deleteDatabaseFile, openSeedDatabase, report } from './seed.util';
import { seedTasks } from './tasks/seed-tasks';

/**
 * Todos os seeds, NA ORDEM DE DEPENDÊNCIA.
 *
 * Quem é referenciado vem antes de quem referencia: se `comentarios` aponta para `tarefas`,
 * `seedTasks` roda primeiro — senão a chave estrangeira recusa a linha. Seed novo entra nesta
 * lista, no lugar certo da ordem.
 *
 *   npm run seed:all   → grava por cima do que existe (idempotente)
 *   npm run db:reset   → APAGA o banco, recria as tabelas e grava tudo do zero
 */
async function main(): Promise<void> {
  if (process.argv.includes('--reset')) {
    deleteDatabaseFile();
    console.log('Banco apagado. Recriando do zero…');
  }

  const { db, close } = openSeedDatabase();

  try {
    report('tarefas', await seedTasks(db));
  } finally {
    close();
  }

  console.log('Seeds concluídos.');
}

void main();
