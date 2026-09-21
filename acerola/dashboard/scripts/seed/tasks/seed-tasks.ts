import { sql } from 'drizzle-orm';

import { type Database } from '../../../server/src/lib/db/db.type';
import { tasks } from '../../../server/src/lib/db/schema/tasks.schema';
import { openSeedDatabase, report } from '../seed.util';
import { TASKS_SEED } from './tasks.data';

/**
 * Grava as tarefas de teste.
 *
 * `onConflictDoUpdate` pelo `id` é o que torna o seed idempotente: a segunda execução
 * reescreve as mesmas linhas, e quem editou uma tarefa de teste na tela a vê voltar ao
 * original — que é exatamente o que "rodar o seed" promete.
 */
export async function seedTasks(db: Database): Promise<number> {
  await db
    .insert(tasks)
    .values(TASKS_SEED)
    .onConflictDoUpdate({
      target: tasks.id,
      set: {
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        status: sql`excluded.status`,
        createdBy: sql`excluded.created_by`,
        updatedAt: null,
        updatedBy: null,
      },
    });

  return TASKS_SEED.length;
}

/* Rodando sozinho (`npm run seed:tasks`), abre o banco e grava só esta entidade. */
if (require.main === module) {
  void openSeedDatabase().then(async ({ db, close }) => {
    try {
      report('tarefas', await seedTasks(db));
    } finally {
      await close();
    }
  });
}
