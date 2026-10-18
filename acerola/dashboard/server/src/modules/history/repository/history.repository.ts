import { Inject, Injectable } from '@nestjs/common';

import { runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { history, type HistoryInsert } from '../../../lib/db/schema/history.schema';

/** O repository não tem regra: grava a linha que recebeu. */
@Injectable()
export class HistoryRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async insert(values: HistoryInsert): Promise<void> {
    await runQuery(this.db.insert(history).values(values), 'registrar histórico');
  }
}
