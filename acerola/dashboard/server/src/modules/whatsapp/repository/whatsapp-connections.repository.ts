import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  type WhatsappConnectionRow,
  whatsappConnections,
} from '../../../lib/db/schema/whatsapp-connections.schema';

@Injectable()
export class WhatsappConnectionsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async find(userId: string): Promise<WhatsappConnectionRow | null> {
    return runMaybe(
      this.db
        .select()
        .from(whatsappConnections)
        .where(eq(whatsappConnections.userId, userId))
        .limit(1),
      'ler vínculo de WhatsApp',
    );
  }

  /** Todos os vínculos — são poucos: um por pessoa que administra. */
  async list(): Promise<WhatsappConnectionRow[]> {
    return runQuery(this.db.select().from(whatsappConnections), 'listar vínculos de WhatsApp');
  }

  /** Grava o número vinculado. Trocar de número mantém a linha e renova a data do vínculo. */
  async save(userId: string, phone: string, operatorName: string | null = null): Promise<void> {
    const now = new Date();

    await runQuery(
      this.db
        .insert(whatsappConnections)
        .values({ userId, phone, operatorName, linkedAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: whatsappConnections.userId,
          set: { phone, operatorName, linkedAt: now, updatedAt: now },
        }),
      'gravar vínculo de WhatsApp',
    );
  }

  async remove(userId: string): Promise<void> {
    await runQuery(
      this.db.delete(whatsappConnections).where(eq(whatsappConnections.userId, userId)),
      'remover vínculo de WhatsApp',
    );
  }
}
